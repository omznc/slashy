<p align="center"><img src="https://i.imgur.com/j8rrx7R.png" style="width: 8rem;border-radius: 20%;"><h1 align="center">Slashy - Your open-source custom  slash-commands bot</h1></p>
<p align="center"><a href="https://top.gg/bot/928089024252506173"><img src="https://img.shields.io/badge/top.gg-Slashy-blue?style=for-the-badge"></a> <a href="https://hey.imkez.com/slashy-invite"><img src="https://img.shields.io/badge/Invite%20Me%20to-Discord-blue?style=for-the-badge&logo=discord"></a> <a href="https://radial-earthquake-f92.notion.site/Slashy-5170195d1860408392dd1db537bca0ea"><img src="https://img.shields.io/badge/Roadmap-blue?style=for-the-badge&logo=notion"></a></p>


## Hey, I'm Slashy - your friendly neighborhood custom-command bot!

The code for this bot exists because I like the open-source community, so feel free to run it yourself, or submit pull requests to improve it.

You can get help on using the bot with the `/slashy help` command in any of the servers Slashy is in, or in Slashy's DM-s.

## Disclaimer

The text below refers to the current production code that is running as the Slashy bot, it does not refer to the code in this repository and should not be used as help documentation for this source code. You can read [my note](https://github.com/omznc/Slashy/edit/main/README.md#notes) at the bottom of this page.

## Invite

Click [right here](https://hey.imkez.com/slashy-invite) to add Slashy to your server.

## Changes
Check [CHANGELOG.md](https://github.com/omznc/Slashy/blob/main/CHANGELOG.md) for all changes.

## Help
Below are all the commands you can currently use.

<u>Underlined</u> commands mean that only members with a set permission can use them. Defaults to owner-only.. Set with `/slashy config <role>` which is always restricted to the owner permission..

<> are required arguments and [] are optional arguments.

You can't create commands with names that start with `slashy` as I've reserved those for the bot.

| Command 	| Usage 	| Description 	|
|---	|---	|---	|
| <ins>add</ins> 	| `/slashy add` `name` `reply` *`description`* *`ephemeral`* 	| Add new slash commands.<br>Description and Ephemeral (hidden reply) fields  are optional.<br>Default Description: `A command made by Slashy`<br>Default Ephemeral status: `False`|
| <ins>remove</ins> 	| `/slashy remove` `name` 	| Remove existing slash commands. 	|
| <ins>edit</ins> 	| `/slashy edit` `name` *`new-reply`* *`new-description`* *`new-ephemeral`* 	| Edit an existing command's reply, description, ephemeral status, or all of the above at once. 	|
| <ins>config</ins> 	| `/slashy config` `role` 	| Set the role required to manage slash commands. Can only be run by the server owner. 	|
| list 	| `/slashy list` 	| List all of your server's commands. 	|
| stats 	| `/slashy stats` 	| Display some Slashy statistics.<br>Different outputs whether you run it in a server or a DM. 	|
| help 	| `/slashy help` 	| You guessed it, shows you this, but in Discord! 	|




## Placeholders
These are all the placeholders you can use in your custom command replies. 
They don't work in descriptions because that can't be dynamically changed.
Feel free to open an issue to suggest any new ones.
 
| Placeholder 	| Description 	|
|---	|---	|
| `[[user]]` 	| Mentions the user who ran the command. 	|
| `[[user.id]] `	| The user ID of the user who ran the command. 	|
| `[[user.name]] `	| The username of the user who ran the command. 	|
| `[[owner]]` 	| Mentions the server owner. 	|
| `[[owner.id]] `	| The user ID of the server owner. 	|
| `[[user.avatar]]` 	| The avatar URL of the user who ran the command. 	|
| `[[server]] `	| The server name. 	|
| `[[server.id]] `	| The server's ID. 	|
| `[[server.member_count]]` 	| The server's member count. 	|
| `[[channel]]` 	| The channel the command was ran in. 	|
  

## Contributing
Feel free.

## License

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html), so you can do a lot of things with it, as long as your code is open-source as well. Would be cool of you to link back to this project, but it's not required.

This was built using some code from [LiveLaunch](https://github.com/juststephen/LiveLaunch), which is licensed under the same license.

## Notes
This repository is an open-source version of my Slashy bot that I will not be actively maintaining. 
2 versions of Slashy exist:
- Slashy Python (the python branch)
- Slashy Typescript (production code, this branch.)

