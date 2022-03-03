## Changelog

### The Commands Update - 17. Feb, 2022

- Moved all commands under the `/slashy` category.
   - Every non-custom command now starts with `/slashy`, e.g. `/slashy add`
   - This made it so you can use names like `help`, `list` and such as your custom command names.
- Added `/slashy config` so you can set a permission level to use the bot.
   - The command is `Administrator`-only and will stay that way.
   - If you want me to add any other permissions, open an issue.
- Redone some of the cog organization. This shouldn't concern end-users, just makes my life easier.
- Fixed SQL injection... lol.
- Probably introduced new bugs. Time will tell.
- New logo, that's cool I guess.

### The Cleaner Code Update - 13. Feb, 2022

- Added placeholder support:
   - Things like `[[user]]`, `[[server.member_count]]` and such.
   - Read up below.

- Updated Novus to latest Github build, which in turn allowed me to do the following:
   - Added auto-completion support for command names when using /edit and /remove.
   - No longer using raw HTTP requests to manage your commands.
- Cleaned up a lot of unnecessary code.
