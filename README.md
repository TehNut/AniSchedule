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

Commands are now handled directly through Discord's slash command system. This includes permissions, as well! 

When the bot is first added to a server, only `/about`, `/upcoming`, and `/watching` will be available to users. The server owner will need to run `/permission <PERMISSION>` to enable other commands for anybody else. Editing commands can be limited to either just the owner, a specific role, or the limit can be removed and anybody can use them. 

In order to reduce potential spam, commands that take a channel argument will send an ephemeral reply if the channel requested is not the same as the one the command was used in.