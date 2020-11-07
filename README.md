# AniSchedule [![Latest Release](https://img.shields.io/github/v/release/TehNut/AniSchedule?color=%233DB4F2&label=release&style=flat-square)](https://github.com/TehNut/AniSchedule/releases/latest)

A Discord bot that uses the [AniList](https://anilist.co) API to retrieve the airing schedule for configured anime and
sends a message when a new episode has aired.

![Example Announcement](./img/example.png) ![Example Announcement](./img/example2.png)

## Running Locally

Make sure you have [Node.js](https://nodejs.org/) installed.

Run these commands to get the project locally:

```sh
git clone https://github.com/TehNut/AniSchedule.git # or clone your own fork
cd AniSchedule
npm install
npm run build
```

Create a new `.env` file in the root directory of the project (the same directory as this README) with the following property:

```
BOT_TOKEN=$TOKEN
```

`$TOKEN` should be the bot token obtained from [Discord's developer panel](https://discordapp.com/developers/).

Finally, run `npm start` to start the bot.

## Commands

Commands should be prefixed by the prefix set for your server. The default prefix is `?as`. If you wish to change the prefix for
your server, run `?asprefix <prefix>`.

eg: If your prefix is `?as`, the command would be `?aswatch`.

For a list of commands, run `?ashelp`. To get help with a specific command, you can run `?ashelp <command>` (Don't use the prefix).

Some commands require specific permissions. To set the permission level for your server, run `?aspermission <permission>`.