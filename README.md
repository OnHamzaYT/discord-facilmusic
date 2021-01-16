# DISCORD-FACILMUSIC

> **Ce module vous permet de cree votre propre bot discord musique facilement !**

## Installer le module
```
npm i discord-facilmusic
```

## Utilisation
Ce module **très simple d'utilisation** vous permettra de faire un bot discord musique Tout cela en une seule ligne !
```js
const Discord = require('discord.js');
const client = new Discord.Client();
const FacilMusic = require('discord-facilmusic');

const client = new Discord.Client();

const settings = {
  token: "TOKEN DE VOTRE BOT",
  prefix: "PREFIX DE VOTRE BOT"
};

const musicBot = new FacilMusic({
    clientPrefix: settings.prefix, // Préfix du bot musique
    youtubeApiKey: "YOUTUBE_API_KEY", // Clé d'API Youtube
    discordClient: client, // Ne pas toucher,
    config: {
        helpCommand: true // true: le bot enverra la liste des commandes | false: Le bot ne répondra à la commande "help"
    }
});
 
client.on('message', message => { // Ne pas toucher
    musicBot.onMessage(message);
});

client.login(settings.token);
```

## Auteur
> **On Hamza** | Discord: **On Hamza#9999** (ID: `686172394683236406`)

* GitHub : [Cliquez ici](https://github.com/OnHamzaYT)

## 📝 License
© On Hamza - 2020-2021

> Ce projet est sous license **MIT**.
