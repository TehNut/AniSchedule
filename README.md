# AniSchedule

A Discord bot that uses the [AniList](https://anilist.co) API to retrieve the airing schedule for configured anime and 
sends a message when a new episode has aired.

![Example Announcement](./img/example.png)

## Running Locally

Make sure you have [Node.js](https://nodejs.org/) installed.

Create a new `.env` file with the following properties:

```
BOT_TOKEN=$TOKEN
COMMAND_PREFIX=$PREFIX
```

`$TOKEN` should be the bot token obtained from [Discord's developer panel](https://discordapp.com/developers/).

`$PREFIX` should be a string required before the command name. If unset, `!` will be used.

```sh
git clone https://github.com/TehNut/AniSchedule.git # or clone your own fork
cd AniSchedule
npm install
npm start
```


## Commands

Commands should be prefixed by the prefix set in the `.env` file.

eg: If your prefix is `?as`, the command would be `?aschannel`.

* `channel`

  This command sets the channel for announcements to be sent. It can only be used by the server owner and should be used
  in the channel you want.
  
* `watch`

  This command adds a new anime to watch for new episodes of. It takes the AniList media ID of the anime which can be obtained
  from the series URL. It can be used by anybody.
  
  eg: In the URL `https://anilist.co/anime/99263/Tate-no-Yuusha-no-Nariagari/`, the ID is `99263`.

* `unwatch`

  This command removes an anime from the list. Just as with the `watch` command, it takes the AniList media ID. It can be
  used by anybody.

* `watching`
  
  This command prints a list of all anime names being watched that are still currently airing. It can be used by anybody.
