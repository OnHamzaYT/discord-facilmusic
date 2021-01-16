/* 
    Please read the copyright...
    [-> LICENSE
*/

const Package = require('../package.json');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');
const colors = require('hexacolors');
const Youtube = require('simple-youtube-api');
const db = require('quick.db');

let help = [];

class FacilMusic {
    /**
     * @typedef {object} Options
     * @property {string} youtubeApiKey - Votre clé d'API YouTube
     * @property {string} discordClient - Le Discord.Client();
     * @property {string} clientPrefix - Le préfix de votre bot
     * @property {object} config - Configuration du bot 
     */
    /**
     * @param {Options} options
     */
    
    constructor (options) {
        this.err = chalk.red(`[discord-facilbot] Erreur: `);
        this.warning = chalk.yellow(`[discord-facilbot] Avertissement: `);
        

        if(!help.map(h => h.category).includes("🎧 ❱ Musique")) {
            help.push({
                category: "🎧 Musique",
                commands: [{
                    name: "connect",
                    desc: "Je rejoins votre salon vocal."
                },{
                    name: "disconnect",
                    desc: "Je quitte"
                },{
                    name: "play",
                    desc: "Je rejoins votre salon vocal & diffuse la musique souhaitée."
                },{
                    name: "stop",
                    desc: "J'arrête la diffusion de la musique & quitte le salon vocal !"
                },{
                    name: "lyrics",
                    desc: "Obtenez les paroles de musiques !"
                },{
                    name: "queue",
                    desc: "Liste les musique en attente !"
                },{
                    name: "repeat",
                    desc: "Lancez la boucle pour répéter le morceau en cours de diffusion lorsqu'il sera terminé !"
                },{
                    name: "clear",
                    desc: "Supprime toutes les musiques en attente."
                },{
                    name: "skip",
                    desc: "Termine instantanément la musique en cours de diffusion et passe à la suivante, s'il y en a."
                },{
                    name: "now-play",
                    desc: "Affiche la musiue en cours de diffusion & sa progression."
                },{
                    name: "pause",
                    desc: "Met en pause la musique en cours de diffusion."
                },{
                    name: "volume",
                    desc: "Paramètre le volume de diffusion de musique du bot."
                }]
            });
        };

        if(!options.youtubeApiKey) throw new Error(this.err + chalk.red(`Vous devez fournir une clé d'API YouTube !`));
        if(!options.discordClient) throw new Error(this.err + chalk.red(`Vous devez fournir l'intégration Discord.Client() !`));
        if(!options.clientPrefix) throw new Error(this.err + chalk.red(`Vous devez fourir un prefix !`));
        if(!options.config) throw new Error(this.err + chalk.red(`Vous devez fournir une configuration !`));
        this.prefix = options.clientPrefix;
        this.client = options.discordClient;
        this.ytApiKey = options.youtubeApiKey;
        this.reactionsManager = new Map();
        this.musicParams = new Map();
        
        this.youtube = new Youtube("AIzaSyB7XnDTwMmqt6PB8WkQfALBvLUJ7hjYO-k")

        let logs = chalk.blue("╔════════════════════╗\n║   ");
        logs += chalk.cyanBright("[discord-facilbot] Discord Music");
        logs += chalk.blue("    ║\n╠════════════════════╝\n║ ");
        logs += chalk.yellow("Prefix: ");
        logs += chalk.gray(this.prefix);
        logs += chalk.blue("\n╚════════════════════·");
        console.log(logs);
    };

    /**
     * @api public
     */
    async onMessage(msg) {
        if(msg.channel.type === "dm") return msg.channel.send("Vous ne pouvez pas exécuter de commandes en messages privés !");

        if(!msg.content.startsWith(this.prefix)) return;
        if(msg.author.bot) return;
        if(!msg.guild) return;

        const cmd = msg.content.slice(this.prefix.length).split(" ")[0];
        const args = msg.content.slice(this.prefix.length + cmd.length + 1).trim().split(/ +/g);
        
        if(cmd.length === 0) return;

        if(cmd == "join" || cmd == "connect") {
            if(!msg.guild.me.hasPermission(["CONNECT"])) return this.sendError("Je n'ai pas les permisions requises pour effectuer cette commande !", msg);
            if(!msg.member.voice.channelID) return this.sendError("Vous devez être dans un salon vocal pour utiliser cette commande !", msg);
            if(msg.guild.me.voice.channelID) return this.sendError("Je suis déjà dans un salon vocal !", msg);
            try {
                await msg.member.voice.channel.join();
                var embed = new Discord.MessageEmbed()
                    .setColor(colors.green)
                    .setDescription(`✅ ${msg.author.toString()} ***J'ai rejoins votre salon vocal !***`)
                return msg.channel.send(embed).catch(()=>{});
            } catch {
                return this.sendError("Je n'ai pas pu rejoindre votre salon vocal !", msg);
            };
        } else if(cmd == "leave" || cmd == "disconnect") {
            if(!msg.member.voice.channelID) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            if(!msg.guild.me.voice.channelID) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Je ne suis pas dans un salon vocal !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            try {
                await msg.member.voice.channel.leave();
                if(this.musicParams.get(msg.guild.id) && this.musicParams.get(msg.guild.id).connection && this.musicParams.get(msg.guild.id).connection.dispatcher) {
                    this.musicParams.get(msg.guild.id).connection.dispatcher.end();
                    this.musicParams.delete(msg.guild.id);
                };
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.green)
                    .setDescription(`✅ ${msg.author.toString()} ***J'ai quitté votre salon vocal !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } catch {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Je n'ai pas pu quitter votre salon vocal !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
        } else if((cmd == "play" && !args[0]) || (cmd == "p" && !args[0]) || cmd == "resume" || cmd == "res") {
            if(!msg.guild.me.hasPermission(["CONNECT", "SPEAK"])) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Je n'ai pas les permisions requises pour effectuer cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            }
        
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID && (msg.guild.me.voice.channelID !== voiceChannel.id)) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(this.musicParams.get(msg.guild.id).playing) return this.sendError("La diffusion de musique n'est pas en pause !", msg);

            if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).connection || !this.musicParams.get(msg.guild.id).connection.dispatcher) return this.sendError("Je ne diffuse pas de musique !", msg);
            try {
                this.musicParams.get(msg.guild.id).connection.dispatcher.resume();
                this.musicParams.get(msg.guild.id).playing = true;
                var embed = new Discord.MessageEmbed()
                    .setColor(colors.green)
                    .setDescription(
                        `✅ ***Reprise de la diffusion de musique !***`
                    )
                msg.channel.send(embed).catch(()=>{});
            } catch {
                this.musicParams.delete(msg.guild.id);
                return this.sendError("Je n'ai pas pu continuer à diffuser la musique, veuillez réessayer !", msg);
            };
        } else if(cmd == "play" || cmd == "p" || cmd == "add") {
            if(!msg.guild.me.hasPermission(["CONNECT", "SPEAK"])) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Je n'ai pas les permisions requises pour effectuer cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            }
        
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID && (msg.guild.me.voice.channelID !== voiceChannel.id)) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
        
            const searchString = args.join(' ');
            const url = args[0].replace(/<(._)>/g, '$1');
            if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
                const playlist = await this.youtube.getPlaylist(url);
                const videos = await playlist.getVideos();
                for(const video of Object.values(videos)) {
                    const video2 = await this.youtube.getVideoByID(video.id)
                    await this.handleVideo(video2, msg, voiceChannel, true);
                };
            } else {
                try{
                    var video = await this.youtube.getVideoByID(url);
                } catch {
                    try{
                        var videos = await this.youtube.searchVideos(searchString, 10);
                        var points = [];
                        var words = searchString.split(" ");
                        for (var i = 0; i < words.length; i++) {
                            var word = words[i];
                            for (var g = 0; g < videos.length; g++) {
                                var video = videos[g];
                                if(points.filter(c => c[0] == video.id).length <= 0) points.push([video.id, 0])
                                if(video.title.toLowerCase().includes(word.toLowerCase())) points.filter(c => c[0] == video.id)[0][1]++
                            };
                        };
                        
                        var video = await this.youtube.getVideoByID(points.sort((a, b) => b[1] - a[1])[0][0]);
                    } catch (err) {
                        var err_embed = new Discord.MessageEmbed()
                            .setColor(colors.red)
                            .setDescription(`:x: ${msg.author.toString()} ***Aucun résultat !***`)
                        msg.channel.send(err_embed).catch(()=>{});
                        if(err.code == 403) throw new Error(this.err + chalk.red("Votre clé d'API YouTube est invalide..."))
                    };
                };
                return this.handleVideo(video, msg, voiceChannel);
            };
        } else if(cmd == "stop" || cmd == "kill" || cmd == "destroy") {
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID !== voiceChannel.id) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).songs[0]) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Le bot ne diffuse pas de musique !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            
            this.musicParams.get(msg.guild.id).repeat = false;
            this.musicParams.get(msg.guild.id).replay = false;
            if(this.musicParams.get(msg.guild.id).connection.dispatcher) this.musicParams.get(msg.guild.id).connection.dispatcher.end();
            var embed = new Discord.MessageEmbed()
                .setColor(colors.blue)
                .setFooter(msg.author.username, msg.author.displayAvatarURL())
                .setDescription(`**⏹️ Arrêt de la diffusion de musique !**`)
            return msg.channel.send(embed).catch(err => { if(err) return Debug(err); });
        } else if(cmd == "lyrics" || cmd == "paroles" || cmd == "text") {
            if(!args[0]) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez fournir le titre de la chanson dont vous voulez les paroles !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };

            var searching = new Discord.MessageEmbed()
                .setColor(colors.yellow)
                .setFooter(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`🔎 ***Recherche du lyric de la chanson en cours de diffusion...***`)
            var message = await msg.channel.send(searching).catch(()=>{});

            var res = await fetch(`https://some-random-api.ml/lyrics?title=${encodeURIComponent(args.join(" "))}`);
            var lyrics = await res.json();
            if (lyrics.error) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(
                        `:x: ***Je n'ai pas pu trouver la chanson !***`
                    )
                return message.edit(err_embed).catch(()=>{});
            };
            if (lyrics.lyrics.length >= 2048) {
                var cut = lyrics.lyrics.length - 2000
                lyrics.lyrics = lyrics.lyrics.slice(0, 0 - cut) + '...'
            };
            var lyrics_embed = new Discord.MessageEmbed()
                .setColor(colors.blue)
                .setFooter(`Demandé par: ${msg.author.username}`, msg.author.displayAvatarURL())
                .setTitle(`🎶 ${lyrics.title}`)
                .setDescription(lyrics.lyrics)
            message.edit(lyrics_embed).catch(()=>{});
        } else if(cmd == "queue" || cmd == "q" || cmd == "list" || cmd == "show") {
            if (!msg.member.voice.channel) return this.sendError('Vous devez être dans un salon vocal pour utiliser cette commande !', message);

            if (this.client.voice.connections.get(msg.guild.id) && msg.member.voice.channel && msg.member.voice.channel.id !== this.client.voice.connections.get(msg.guild.id).channel.id) {
                return this.sendError('Vous devez être dans le même salon vocal que moi pour utiliser cette commande !', msg);
            };

            const serverQueue = this.musicParams.get(msg.guild.id);
            if (!serverQueue) {
                return this.sendError('Je ne diffuse aucune musique !', msg);
            };

            if (!serverQueue.songs[1]) {
                return this.sendError("Il n'y a plus de chansons dans la queue !", msg);
            };

            return this.sendQueueEmbed(serverQueue, msg);
        } else if(cmd == "repeat" || cmd == "loop") {
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID !== voiceChannel.id) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).songs[0]) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Le bot ne diffuse pas de musique !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            this.musicParams.get(msg.guild.id).repeat = true;
            var embed = new Discord.MessageEmbed()
                .setColor(colors.green)
                .setDescription(`🔂 ${msg.author.toString()} ***La boucle est activée !***`)
            return msg.channel.send(embed).catch(()=>{});
        } else if(cmd == "clear" || cmd == "delete-queue") {
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID !== voiceChannel.id) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).songs[0]) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Le bot ne diffuse pas de musique !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            this.musicParams.get(msg.guild.id).songs.splice(1, this.musicParams.get(msg.guild.id).songs.length - 1);
        } else if(cmd == "skip" || cmd == "s") {
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID !== voiceChannel.id) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).songs[0] || !this.musicParams.get(msg.guild.id).playing) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Le bot ne diffuse pas de musique !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };

            var repeat = this.musicParams.get(msg.guild.id).repeat;
            if(repeat) this.musicParams.get(msg.guild.id).repeat = false;
            if(this.musicParams.get(msg.guild.id).connection && this.musicParams.get(msg.guild.id).connection.dispatcher) this.musicParams.get(msg.guild.id).connection.dispatcher.end();
            if(!this.musicParams.get(msg.guild.id).songs[1]) {
                var embed = new Discord.MessageEmbed()
                    .setColor(colors.green)
                    .setFooter(msg.author.username, msg.author.displayAvatarURL())
                    .setDescription(`**⏹️ Musique passée, la queue est vide, arrêt de la diffusion de musique !**`)
                return msg.channel.send(embed).catch(()=>{});
            };
            this.musicParams.get(msg.guild.id).repeat = repeat;
            var embed = new Discord.MessageEmbed()
                .setColor(colors.green)
                .setFooter(msg.author.username, msg.author.displayAvatarURL())
                .setDescription(`**⏭️ Musique passée !**`)
            msg.channel.send(embed).catch(()=>{});
        } else if(cmd == "now-play" || cmd == "np") {
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID !== voiceChannel.id) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).songs[0]) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Le bot ne diffuse pas de musique !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            };
            
            const song = this.musicParams.get(msg.guild.id).songs[0];

            var duration = 0;
            duration += parseInt(song.duration.seconds) * 1000;
            duration += parseInt(song.duration.minutes) * 60000;
            duration += parseInt(song.duration.hours) * 3600000;

            if(duration == 0) {
                var embed = new MessageEmbed()
                    .setColor(colors.blue)
                    .setFooter(msg.author.username, msg.author.displayAvatarURL())
                    .setDescription(`**[${song.title}](${song.url})**`)
                    .addField(
                        `❱ **Chaîne**`,
                        `[${song.channel.name}](${song.channel.url})`,
                        true
                    ).addField("\u200b", "\u200b", true).addField(
                        `❱ **Durée**`,
                        "∞",
                        true
                    ).setThumbnail(song.thumbnail)
                return msg.channel.send(embed).catch(()=>{});
            };
            
            var isAt = Date.now() - this.musicParams.get(msg.guild.id).playingSince;
            if(this.musicParams.get(msg.guild.id).pausingSince > 0) isAt -= Date.now() - this.musicParams.get(msg.guild.id).pausingSince
            var load = "";
            var _start = Math.round(isAt / duration * 100 / 3);
            load += "▬".repeat(_start) + "🔘" + "▬".repeat(34 - _start);
            
            var past = Date.now() - this.musicParams.get(msg.guild.id).playingSince;
            if(this.musicParams.get(msg.guild.id).pausingSince > 0) past -= Date.now() - this.musicParams.get(msg.guild.id).pausingSince;
            var rest = duration - past;

            var time = {
                rest: [],
                past: []
            };
            var hours = Math.floor((rest % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((rest % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((rest % (1000 * 60)) / 1000);
            if(hours > 0) time.rest.push(hours.toString());
            time.rest.push(hours > 0 && minutes.toString().length == 1 ? `0${minutes}` : minutes.toString())
            time.rest.push(seconds.toString().length == 1 ? `0${seconds}` : seconds.toString());

            hours = Math.floor((past % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            minutes = Math.floor((past % (1000 * 60 * 60)) / (1000 * 60));
            seconds = Math.ceil((past % (1000 * 60)) / 1000);
            if(hours > 0) time.past.push(hours.toString());
            time.past.push(hours > 0 && minutes.toString().length == 1 ? `0${minutes}` : minutes.toString())
            time.past.push(seconds.toString().length == 1 ? `0${seconds}` : seconds.toString());


            var embed = new Discord.MessageEmbed()
                .setColor(colors.blue)
                .setFooter(msg.author.username, msg.author.displayAvatarURL())
                .setDescription(`**[${song.title}](${song.url})**`)
                .addField(
                    `❱ **Chaîne**`,
                    `[${song.channel.name}](${song.channel.url})`,
                    true
                ).addField("\u200b", "\u200b", true).addField(
                    `❱ **Durée**`,
                    song.time,
                    true
                ).addField(
                    "❱ **Progression**",
                    `${time.past.join(":")} » \`\`${load}\`\` » ${time.rest.join(":")}`
                ).setThumbnail(song.thumbnail)
            msg.channel.send(embed).catch(()=>{});
        } else if(cmd == "pause") {
            if(!msg.guild.me.hasPermission(["CONNECT", "SPEAK"])) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Je n'ai pas les permisions requises pour effectuer cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            }
        
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID && (msg.guild.me.voice.channelID !== voiceChannel.id)) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).playing) return this.sendError("La diffusion de musique est déjà en pause !", msg);

            this.musicParams.get(msg.guild.id).playing = false;
            try {
                this.musicParams.get(msg.guild.id).connection.dispatcher.pause();
                this.musicParams.get(msg.guild.id).pausingSince = Date.now();
                var embed = new Discord.MessageEmbed()
                    .setColor(colors.green)
                    .setFooter(msg.author.username, msg.author.displayAvatarURL())
                    .setDescription(`**⏸️ Diffusion de musique mit en pause !**`)
                return msg.channel.send(embed).catch(err => { if(err) return Debug(err); });
            } catch {
                this.musicParams.delete(msg.guild.id);
                return this.sendError("Je n'ai pas pu mettre la diffusion de musique en pause, arrête de la diffusion de la musique !", msg);
            };
        } else if(cmd == "vol" || cmd == "setVolume" || cmd == "volume") {
            var voiceChannel = msg.member.voice.channel;
            if(!voiceChannel) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans un salon vocal pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(msg.guild.me.voice.channelID && (msg.guild.me.voice.channelID !== voiceChannel.id)) {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setDescription(`:x: ${msg.author.toString()} ***Vous devez être dans le même salon vocal que moi pour utiliser cette commande !***`)
                return msg.channel.send(err_embed).catch(()=>{});
            } else if(!this.musicParams.get(msg.guild.id) || !this.musicParams.get(msg.guild.id).playing) return this.sendError("La diffusion de musique est déjà en pause !", msg);

            if(!args[0]) return this.sendError("Vous devez fournir une valeur entre 1 et 100 inclus !", msg);
            var volume = parseInt(args[0]);
            if(isNaN(volume) || volume <= 0 || volume > 100) return this.sendError("Vous devez fournir une valeur valide entre 1 et 100 inclus !", msg);
            
            this.musicParams.get(msg.guild.id).volume = volume / 10;
            this.musicParams.get(msg.guild.id).connection.dispatcher.setVolumeLogarithmic(this.musicParams.get(msg.guild.id).volume / 5);
            var volume_embed = new Discord.MessageEmbed()
                .setColor(colors.green)
                .setFooter(msg.author.username, msg.author.displayAvatarURL())
                .setDescription(`🎚️ **Volume réglé à \`\`${volume}%\`\` !**`)
            msg.channel.send(volume_embed).catch(()=>{});
        } else if((cmd == "help" || cmd == "h") && this.config.helpCommand) {
            var embed = new Discord.MessageEmbed()
                .setColor(colors.blue)
                .setFooter(msg.author.tag, msg.author.displayAvatarURL())
            help.forEach(h => {
                embed.addField(
                    h.category,
                    h.commands.map(c => `\`\`${c.name}\`\``).join(", ")
                )
            });
            msg.channel.send(embed).catch(()=>{});
        };
    };

    /**
     * @api private
     */
    async handleVideo(video, message, voiceChannel, playlist = false) {

        var time = [];
        if(video.duration.hours == 0 && video.duration.minutes == 0 && video.duration.seconds == 0) {
            time.push("∞");
        } else {
            if(video.duration.hours > 0) time.push(`${video.duration.hours}`);
            time.push(video.duration.hours > 0 ? video.duration.minutes >= 10 ? video.duration.minutes : `0${video.duration.minutes}` : video.duration.minutes);
            time.push(video.duration.seconds >= 10 ? video.duration.seconds : `0${video.duration.seconds}`);
        };
    
        const song = {
            id: video.id,
            title: Discord.Util.escapeMarkdown(video.title),
            url: `https://www.youtube.com/watch?v=${video.id}`,
            author: {
                tag: message.author.tag,
                avatar: message.author.displayAvatarURL()
            },
            thumbnail: video.thumbnails.standard ? video.thumbnails.standard.url : video.thumbnails.default.url,
            duration: {
                hours: video.duration.hours,
                minutes: video.duration.minutes,
                seconds: video.duration.seconds
            },
            time: time.join(":"),
            channel: {
                url: `https://www.youtube.com/channel/${video.raw.snippet.channelId}`,
                name: video.raw.snippet.channelTitle
            }
        };
    
        if(!this.musicParams.get(message.guild.id)) {
            this.musicParams.set(message.guild.id, {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                playingSince: 0,
                pausingSince: 0,
                volume: 1,
                playing: true,
                repeat: false,
                replay: false
            });
    
            this.musicParams.get(message.guild.id).songs.push(song);
    
            try{
                var connection = await voiceChannel.join();
                this.musicParams.get(message.guild.id).connection = connection;
                this.play(message.guild, this.musicParams.get(message.guild.id).songs[0]);
            } catch (err){
                Debug(err);
                this.musicParams.delete(message.guild.id);
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setFooter(message.author.username, message.author.displayAvatarURL())
                    .setDescription(`:x: **Erreur lors de la connexion au salon vocal !**`)
                message.channel.send(err_embed).catch(()=>{});
            }
        } else {
            this.musicParams.get(message.guild.id).songs.push(song);
            if(playlist) return undefined;
            else {
                var playing_embed = new Discord.MessageEmbed()
                    .setColor(colors.green)
                    .setFooter(message.author.username, message.author.displayAvatarURL())
                    .setAuthor(`Ajouté à la queue !`, this.client.user.displayAvatarURL())
                    .setDescription(`⏏️ [${video.title}](https://www.youtube.com/watch?v=${video.id})`)
                message.channel.send(playing_embed).catch(()=>{});
            }
        }
        return undefined;
    };

    /**
     * @api private
     */
    async play(guild, song) {
        
        if(!song) {
            this.musicParams.get(guild.id).voiceChannel.leave();
            return this.musicParams.delete(guild.id);
        };

        if(!this.musicParams.get(guild.id).repeat) {
            var music_embed = new Discord.MessageEmbed()
                .setColor(colors.yellow)
                .setFooter(song.author.tag, song.author.avatar)
                .setDescription(`📲 ***Tentative de diffusion de la musique...***`)
            var m = await this.musicParams.get(guild.id).textChannel.send(music_embed).catch(()=>{});
        };
    
        const dispatcher = this.musicParams.get(guild.id).connection.play(ytdl(song.url))
            .on("start", async () => {
                this.musicParams.get(guild.id).playingSince = Date.now();
                if(this.musicParams.get(guild.id).repeat) return;
                if(m) {
                    var playing_embed = new Discord.MessageEmbed()
                        .setColor(colors.blue)
                        .setFooter(song.author.tag, song.author.avatar)
                        .setAuthor(`En cours de diffusion...`, this.client.user.displayAvatarURL())
                        .setDescription(`▶️ [${song.title}](https://www.youtube.com/watch?v=${song.id})`)
                    await m.edit(playing_embed).catch(()=>{});
                } else {
                    var playing_embed = new Discord.MessageEmbed()
                        .setColor(colors.blue)
                        .setFooter(song.author.tag, song.author.avatar)
                        .setAuthor(`En cours de diffusion...`, this.client.user.displayAvatarURL())
                        .setDescription(`▶️ [${song.title}](https://www.youtube.com/watch?v=${song.id})`)
                    this.musicParams.get(guild.id).textChannel.send(playing_embed).catch(()=>{});
                }
            }).on('finish', async () => {
                if(!this.musicParams.get(guild.id)) return;
                if(!this.musicParams.get(guild.id).repeat && !this.musicParams.get(guild.id).replay) this.musicParams.get(guild.id).songs.shift();
                this.play(guild, this.musicParams.get(guild.id).songs[0]);
            }).on('error', () => {
                var err_embed = new Discord.MessageEmbed()
                    .setColor(colors.red)
                    .setFooter(song.author.tag, song.author.avatar)
                    .setDescription(`:x: ***Erreur lors de la diffusion de la musique [${song.title}](https://www.youtube.com/watch?v=${song.id}) !***`)
                this.musicParams.get(guild.id).textChannel.send(err_embed).catch(()=>{});
                if(!this.musicParams.get(guild.id)) return;
                if(!this.musicParams.get(guild.id).repeat && !this.musicParams.get(guild.id).replay) this.musicParams.get(guild.id).songs.shift();
                this.play(guild, this.musicParams.get(guild.id).songs[0]);
            });
        dispatcher.setVolumeLogarithmic(this.musicParams.get(guild.id).volume /5)
    };
    /**
     * @api private
     */
    sendError (message, m) {
        m.channel.send(
            new Discord.MessageEmbed()
                .setColor(colors.red)
                .setDescription(
                    `:x: ***${message}***`
                )
        ).catch(()=>{});
    };

    /**
     * @api private
     */
    async sendQueueEmbed(serverQueue, message) {
        const QueueEmbed = new Discord.MessageEmbed()
            .setColor(colors.orange)
            .setTimestamp()
            .setTitle('🎶 ' + message.guild.name);
        for (let i = 1; i < serverQueue.songs.length && i < 26; i++) {
            QueueEmbed.addField(`\`#${i}\``, `**[${serverQueue.songs[i].title}](${serverQueue.songs[i].url})**`);
        };
        return message.channel.send(QueueEmbed);
    };
};

module.exports = {
    FacilMusic
}