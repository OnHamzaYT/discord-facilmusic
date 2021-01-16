[![NPM](https://nodei.co/npm/discord-facilmusic.png)](https://nodei.co/npm/discord-facilmusic/)

# 🧰 discord-facilmusic

## 📥 Installation
```
npm i discord-facilmusic
```

## 💻 Exemple
```js
const Discord = require('discord.js'); // Require discord.js
const client = new Discord.Client(); // Create the bot client.
const FacilMusic = require('discord-facilmusic');

const musicBot = new FacilMusic({
    clientPrefix: ".", // Préfix du bot musique
    youtubeApiKey: "YOUTUBE_API_KEY", // Clé d'API Youtube
    discordClient: client, // Ne pas toucher,
    config: {
        helpCommand: true // true: le bot enverra la liste des commandes | false: Le bot ne répondra à la commande "help"
    }
});
 
client.on('message', message => { // Ne pas toucher
    musicBot.onMessage(message);
});

client.login('BOT_TOKEN'); // Mettez ici le token de votre bot (https://discord.com/developers/applications/)
```

### 🎶  Tout Les command
* **PLAY**
    * `play`,
    * `add`,
    * `p`,
    * **+ `<recherche par chaine de caractère | URL de la vidéo>`**

* **STOP**
    * `stop`,
    * `kill`,
    * `destroy`,
* **PAUSE**
    * `pause`,
* **RESUME**
    * `resume`,
    * `res`,
    * `play`,
    * `p`
* **SKIP**
    * `skip`,
    * `s`
* **NOW-PLAY**
    * `now-play`,
    * `np`
* **CLEAR**
    * `clear`,
    * `delete-queue`
* **REPEAT**
    * `repeat`,
    * `loop`
* **LEAVE**
    * `leave`,
    * `disconnect`
* **JOIN**
    * `join`,
    * `connect`
* **LYRICS**
    * `lyrics`,
    * `paroles`,
    * `text`
    * **+ `<recherche par chaine de caractère>`**
* **VOLUME**
    * `volume`,
    * `vol`,
    * `setVolume`
* **QUEUE**
    * `queue`,
    * `q`
