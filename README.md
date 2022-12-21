<p align="center"><img src="https://i.imgur.com/j8rrx7R.png" style="width: 8rem;border-radius: 20%;"><h1 align="center">Slashy - Your open-source custom  slash-commands bot</h1></p>
<p align="center">
<a href="https://top.gg/bot/928089024252506173"><img src="https://img.shields.io/badge/top.gg-Slashy-blue?style=for-the-badge"></a>
<a href="https://hey.imkez.com/slashy-invite"><img src="https://img.shields.io/badge/Invite%20Me%20to-Discord-blue?style=for-the-badge&logo=discord"></a> 
<a href="https://hub.docker.com/repository/docker/omznc/slashy"><img src="https://img.shields.io/badge/DockerHub-white?style=for-the-badge&logo=docker"></a></p>


<p align="center"><img src="https://i.imgur.com/yt8Gbmt.png"/></p>

## Hey, I'm Slashy - your friendly neighborhood custom-command bot!

The code for this bot exists because I like the open-source community, so feel free to run it yourself, or submit pull requests to improve it.

You can get help on using the bot with the `/slashy help` command in any of the servers Slashy is in, or in Slashy's DM-s.

## Invite

Click [right here](https://hey.imkez.com/slashy-invite) to add Slashy to your server.

## Changes
Check [CHANGELOG.md](https://github.com/omznc/Slashy/blob/main/CHANGELOG.md) for all changes.

### Versioning
Any version released before 9. Sep, 2022 is considered Beta, and the Python version being considered Alpha. 

There will be no official 'versioning' as the bot will always be running edge code after my internal testing. Feel free to keep your own versions.

## Self-hosting with Docker

Slashy was written with Docker in mind, and fully supports it - it even has its own health-check.
You can find the Dockerfile in the repository if you'd like to build it yourself.
It's also accessible on [Docker Hub](https://hub.docker.com/r/omznc/slashy).

You can run it using 
```shell
docker run omznc/slashy:latest
```
You need to provide the following environment variables:
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord bot client ID
- `DATABASE_URL` - A valid PostgreSQL connection string

### Using Docker Compose
I provided a [docker-compose.yml](https://github.com/omznc/Slashy/blob/main/docker-compose.yml) file for you to use.
It will set up a **persistent PostgreSQL database** and a **volume for the config file** automatically. You only need to provide the `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` environment variables in.

After you've set up the environment variables, you can run the bot using 
```shell
docker compose up -d
```


I've included [watchtower](https://github.com/containrrr/watchtower) to keep the bot up-to-date.
If you already have your own watchtower instance, or don't want automatic updates, feel free to comment out or delete that bit.

You can ignore the `TOPGG_TOKEN` variable. 
I'd like it if you didn't list your bot on top.gg or any other bot listing site, but feel free to use it in any way that covers the license paragraph at the bottom. Yes the licence allows you to do so, but it's just an L move.

## Help
Below are all the commands you can currently use.

<u>Underlined</u> commands mean that only members with a set permission can use them. Defaults to owner-only. Set with `/slashy config <role>` which is always restricted to the owner permission.

*Italicized* arguments are optional.

You can't create commands with names that start with `slashy` as I've reserved those for the bot.

| Command 	           | Usage 	                                                                     | Description 	                                                                                                                                                                     |
|---------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| <ins>add</ins> 	    | `/slashy add` `name` `reply` *`description`* *`ephemeral`* 	                | Add new slash commands.<br>Description and Ephemeral (hidden reply) fields  are optional.<br>Default Description: `A command made by Slashy`<br>Default Ephemeral status: `False` |
| <ins>remove</ins> 	 | `/slashy remove` `name` 	                                                   | Remove existing slash commands. 	                                                                                                                                                 |
| <ins>edit</ins> 	   | `/slashy edit` `name` *`new-reply`* *`new-description`* *`new-ephemeral`* 	 | Edit an existing command's reply, description, ephemeral status, or all of the above at once. 	                                                                                   |
| <ins>config</ins> 	 | `/slashy config` `role` 	                                                   | Set the role required to manage slash commands. Can only be run by the server owner. 	                                                                                            |
| list 	              | `/slashy list` 	                                                            | List all of your server's commands. 	                                                                                                                                             |
| stats 	             | `/slashy stats` 	                                                           | Display some Slashy statistics.<br>Different outputs whether you run it in a server or a DM. 	                                                                                    |
| help 	              | `/slashy help` 	                                                            | You guessed it, shows you this, but in Discord! 	                                                                                                                                 |




## Placeholders
These are all the placeholders you can use in your custom command replies. 
They don't work in descriptions because that can't be dynamically changed.
Feel free to open an issue to suggest any new ones.
 
| Placeholder 	               | Description 	                                     |
|-----------------------------|---------------------------------------------------|
| `[[user]]` 	                | Mentions the user who ran the command. 	          |
| `[[user.id]] `	             | The user ID of the user who ran the command. 	    |
| `[[user.name]] `	           | The username of the user who ran the command. 	   |
| `[[owner]]` 	               | Mentions the server owner. 	                      |
| `[[owner.id]] `	            | The user ID of the server owner. 	                |
| `[[user.avatar]]` 	         | The avatar URL of the user who ran the command. 	 |
| `[[server]] `	              | The server name. 	                                |
| `[[server.id]] `	           | The server's ID. 	                                |
| `[[server.member_count]]` 	 | The server's member count. 	                      |
| `[[channel]]` 	             | The channel the command was ran in. 	             |
  

## Contributing
I probably overlooked a lot of things in my code, but you won't. Want to help?
Read more at [CONTRIBUTING.md](https://github.com/omznc/Slashy/blob/main/CONTRIBUTING.md).

## License

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html), so you can do a lot of things with it, as long as your code is open-source as well. I have a few additions to that license. These additions take precendence if the license mentions anything similar, and they are as follows:
- if you are using the bot for commercial or public use, or re-using it with a different brand or name, I do require attribution in the form of the "Powered by [Slashy](https://github.com/omznc/slashy)" notice that appears in certain commands.

An example would be you hosting Slashy, then charging users access to it. You MAY remove the notice ONLY IF you're hosting the bot for any non-commercial usage.

### A non-legally binding TL;DR
- Charging money for the bot > Attribution required
- Using the bot in a different open-source program/fork > Attribution required
- Using the bot's code in a closed-source program/fork > Forbidden

## Notes
You might notice a python branch. That's the old version of this bot and it's no longer maintained. I'm keeping it there for archival purposes.

Ephemeral means that the reply can only be seen by the person who originally ran the command.

---
[![CI](https://github.com/omznc/slashy/actions/workflows/CI.yml/badge.svg)](https://github.com/omznc/slashy/actions/workflows/CI.yml)

