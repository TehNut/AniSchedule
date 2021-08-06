# AniSchedule [![Latest Release](https://img.shields.io/github/v/release/TehNut/AniSchedule?color=%233DB4F2&label=release&style=flat-square)](https://github.com/TehNut/AniSchedule/releases/latest)

A Discord bot that uses the [AniList](https://anilist.co) API to retrieve the airing schedule for configured anime and
sends a message when a new episode has aired.

Invite the instance managed by myself by [clicking here](https://discord.com/api/oauth2/authorize?client_id=872994081498882118&permissions=51539610624&scope=bot%20applications.commands).

![Example Announcement](./img/preview_announcement.png)

## Commands

Commands are now handled directly through Discord's slash command system. This includes permissions, as well! 

When the bot is first added to a server, only `/about`, `/upcoming`, and `/watching` will be available to users. The server owner will need to run `/permission <PERMISSION>` to enable other commands for anybody else. Editing commands can be limited to either just the owner, a specific role, or the limit can be removed and anybody can use them. 

In order to reduce potential spam, commands that take a channel argument will send an ephemeral reply if the channel requested is not the same as the one the command was used in.

## Running Yourself

Make sure you have [Node.js](https://nodejs.org/) installed.

Run these commands to get the project locally:

```sh
git clone https://github.com/TehNut/AniSchedule.git # or clone your own fork
cd AniSchedule
npm install
npm run build
```

Create a new `.env` file in the root directory of the project (the same directory as this README) with the following properties:

```
BOT_TOKEN=$TOKEN
SET_ACTIVITY=$SET_ACTIVITY
MODE=$MODE
DEV_SERVER_ID=$DEV_SERVER_ID
```

| Variable Name  | Description |
|----------------| ----------- |
| $TOKEN | The token for your bot which you can get from [Discord's developer panel](https://discordapp.com/developers/) |
| $SET_ACTIVITY | Sets bot activity to the number of unique shows it is handling announcements for across all servers |
| $MODE | If set to `DEV`, commands will be registered to a guild instead of globally. Guild-registered commands are updated instantly, while globally registered commands take up to an hour to sync. Any other value will register commands globally as normal. |
| $DEV_SERVER_ID | The server ID to register commands to when `MODE` is set to `DEV`. |

Finally, run `npm run dev` to start the bot.

### Docker

Create the `.env` file as you would above and run `docker-compose up`. 