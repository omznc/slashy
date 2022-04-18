from datetime import datetime, timedelta
from json import load
from logging import warning

from discord import (
    Embed,
    ApplicationCommandOptionChoice,
    ApplicationCommandType,
    Object,
    ApplicationCommand,
)
from discord.errors import NotFound
from discord.ext.commands import Cog

config: dict = load(open("config.json"))
LOGO: str = config["BOT_LOGO"]
AVATAR: str = config["KEZ_AVATAR"]
MAX_COMMANDS_DEFAULT: int = config["MAX_COMMANDS_DEFAULT"]


async def validate_input(
        ctx,
        name: str = None,
        reply: str = None,
        description: str = None,
) -> bool:  # sourcery skip: use-fstring-for-concatenation
    """Checks if the provided inputs are valid for the Discord API.

    Args:
        ctx (discord.Interaction): The context of the command.
        name (str, optional): Command name. Defaults to None.
        reply (str, optional): The reply of the command when invoked. Defaults to None.
        description (str, optional): Command description. Defaults to None.

    Returns:
        bool: True if all fields are valid, False otherwise.
    """

    # Name: 1-32 characters, no spaces, no special characters.
    if name is not None and ((len(name) > 32 or not name.isalpha() or not name.isascii()) or name.isnumeric()):
        await ctx.send(
            content="The name of the command must be less than or equal **32** letters."
                    "\nRemember, you can only use latin characters (a-z), and the command name will always be in lowercase."
                    f"\nYou entered{(': `' + name + '`') if len(name) < 500 else ' a way too long of a name...'}"
        )
        return False

    # Description: 1-100 characters.
    if description is not None and len(description) > 100:
        await ctx.send(
            content="The description of the command must be less than or equal **100** characters."
                    f"\nYours was **{len(description)}** characters long."
        )
        return False

    # Reply: 1-2000 characters.
    if reply is not None and len(reply) > 2000:
        await ctx.send(
            content="The reply of the command must be less than or equal **2000** characters." f"\nYours was **{len(reply)}** characters long."
        )
        return False

    return True


async def setup_embed(page: int, page_size: int) -> Embed:
    """Sets up the Embed for the list command.

    Args:
        page (int): Current page of the command embed.
        page_size (int): The total amount of pages that the embed has.

    Returns:
        Embed: Discord.Embed object.
    """

    embed: Embed = Embed(title=f"Commands ({page}/{page_size + 1})")
    embed.set_thumbnail(url=LOGO)
    embed.set_footer(text="Slashy says Hi!")
    return embed


class CommandHandler(Cog):
    """
    Cog for handling the /slashy commands.
    """

    def __init__(self, bot):
        self.bot = bot
        self.commands: dict = {}
        self.cached_commands: dict = {}
        self.bot.worker = self

    async def run_user_command(self, ctx) -> None:
        """Figures out what reply to send for custom commands.

        Args:
            ctx (): Interaction that we're responding to.
        """
        await ctx.response.defer()

        # All the possible reply parameters.
        placeholders: dict = {
            "[[user]]": ctx.user.mention,
            "[[user.id]]": ctx.user.id,
            "[[user.name]]": ctx.user.name,
            "[[server]]": ctx.guild.name,
            "[[server.id]]": ctx.guild.id,
            "[[server.member_count]]": ctx.guild.member_count,
            "[[channel]]": ctx.channel.name,
        }
        try:
            placeholders["[[user.avatar]]"] = ctx.user.avatar.url
        except AttributeError:
            placeholders["[[user.avatar]]"] = "https://cdn.discordapp.com/embed/avatars/0.png"
            if self.bot.extra_logging:
                print("[WARN] User has no avatar, using default.")

        # Get the reply from the database and replace placeholders.
        if self.cached_commands.get(ctx.guild.id) is None:
            self.cached_commands[ctx.guild.id] = {}

        if self.cached_commands[ctx.guild.id].get(ctx.command_name) is None:
            self.cached_commands[ctx.guild.id][ctx.command_name] = await self.bot.db.get_command(ctx.guild.id,
                                                                                                 ctx.command_name)

        reply: str = self.cached_commands[ctx.guild.id][ctx.command_name]
        if reply is None:
            return await ctx.edit_original_message(
                content="This command either doesn't exist, or you're using one of the commands that Discord's API hasn't updated yet, which may take up to an hour."
                        "\n[Click here to learn more](<https://discord.com/developers/docs/interactions/application-commands#making-a-global-command>), or try again later."
            )

        for placeholder in placeholders:
            reply: str = reply.replace(
                placeholder,
                str(placeholders[placeholder]),
            )

        # This is here because I'm paranoid.
        try:
            await ctx.edit_original_message(content=reply)
            await self.bot.db.increment_command_uses(ctx.guild.id, ctx.command_name)

        except Exception as error:
            await ctx.edit_original_message(content="There was an error with this command. We'll fix it soon.")
            warning(f"{ctx.command_name} failed with {error}")

    async def check_permissions(self, ctx) -> bool:
        """Checks if the user has permissions to use the command.

        Args:
            ctx (): The interaction.

        Returns:
            bool: True if the user has permissions, False otherwise.
        """

        permission: str = await self.bot.db.get_permission(ctx.guild.id)

        for key, value in iter(ctx.author.guild_permissions):
            if key == permission and not value:
                await ctx.send(
                    content=f"You don't have the required permission to use this command ({permission.capitalize()})\nAn Administrator can set this using `/slashy config`."
                )
                return False

        return True

    @staticmethod
    async def help(ctx) -> None:
        """Handles the `/help` command.

        Args:
            ctx: Interaction.
        """
        embed: Embed = Embed(
            color=0x00FF00,
            description="Hey, I'm Slashy - your friendly neighborhood custom-command bot!\nBelow are all the commands you can use.",
            title="Slashy - Help 💡",
            url="https://hey.imkez.com/slashy-code",
        )
        embed.set_author(
            name="from Kez",
            url="https://hey.imkez.com/slashy-invite",
            icon_url=AVATAR,
        )
        embed.set_thumbnail(url=LOGO)
        embed.set_footer(
            text="Hello there!",
        )
        embed.add_field(
            name="__Add__",
            value="Server-only."
                  "\nUsed to add new slash commands."
                  "\nThe description field is optional."
                  "\nYou can use [placeholders](https://hey.imkez.com/slashy-code#placeholders) in your reply"
                  " or even hyperlinks! `[Like this!](https://imkez.com)`."
                  "\nUsage: ```/slashy add <name> <reply> [description]```",
            inline=False,
        )
        embed.add_field(
            name="__Remove__",
            value="Server-only.\nUsed to remove existing slash commands.\nUsage: ```/slashy remove <name>```",
            inline=False,
        )
        embed.add_field(
            name="__Edit__",
            value="Server-only."
                  "\nUsed to edit an existing command's reply, description, or both."
                  "\nUsage: ```/slashy edit <name> [new-reply] [new-description]```",
            inline=False,
        )
        embed.add_field(
            name="__Configuration__",
            value="Server-only."
                  "\nConfigure Slashy"
                  "\nCurrently only supports changing the permission needed to modify commands, and there are only a few hand-picked permissions."
                  "\nUsage: ```/slashy config <permission>```",
            inline=False,
        )
        embed.add_field(
            name="**List**",
            value="Server-only.\nUsed to list all of your server's commands. \nUsage: ```/slashy list```",
            inline=False,
        )
        embed.add_field(
            name="**Stats**",
            value="Displays some global Slashy statistics.\nUsage: ```/slashy stats```",
            inline=False,
        )
        embed.add_field(
            name="_Notes_",
            inline=False,
            value="`<>` are required arguments and `[]` are optional arguments."
                  "\n__Underlined__ commands need permissions to be used. Defaults to **Administrator**, but can be set with `/slashy config`"
                  "\nCommands starting with `slashy` are reserved for bot usage and can't be used as custom commands to prevent confusion.",
        )
        await ctx.send(embed=embed, ephemeral=True)

    async def add(
            self,
            ctx,
            name: str,
            reply: str,
            description: str = "A command made by Slashy",
    ) -> None:
        """Handles the `/add` command.

        Args:
            ctx: Interaction.
            name (str): New command name.
            reply (str): Command reply.
            description (str, optional): Command's description. Defaults to "A command made by Slashy".
        """
        if not await self.check_permissions(ctx):
            return

        name: str = name.lower()
        if name.startswith("slashy"):
            return await ctx.send(content="You can't use the name `slashy` for your command.")

        if not await validate_input(ctx, name, reply, description):
            return

        if await self.bot.db.check_if_command_exists(ctx.guild.id, name):
            return await ctx.send(
                content="A command with that name already exists. You can use `/edit` to edit it, or `/remove` to remove it.")

        max_commands: int = await self.bot.db.get_max_commands(ctx.guild.id)
        if max_commands is None:
            await self.bot.db.add_new_guild(ctx.guild.id)
            max_commands = MAX_COMMANDS_DEFAULT

        if await self.bot.db.get_number_of_commands(ctx.guild.id) >= max_commands:
            return await ctx.send(
                content=f"You have reached the maximum number of **Slashy** commands ({max_commands}) for your server."
                        "\nPlease remove some before adding more. 🙂"
                        "\nThis limit will be increased in the future."
            )
        response = await ctx.guild.create_application_command(
            ApplicationCommand(
                name=name,
                description=description,
                type=ApplicationCommandType.chat_input,
            )
        )

        # Add the command to the database.
        await self.bot.db.add_new_command(
            response.id,
            ctx.guild.id,
            name,
            reply,
            description,
        )

        # Add the command to the cache.
        if self.cached_commands.get(ctx.guild.id) is None:
            self.cached_commands[ctx.guild.id] = {}
        if self.cached_commands[ctx.guild.id].get(name) is None:
            self.cached_commands[ctx.guild.id][name] = reply

        await ctx.send(content=f"The command `/{name}` has been created.")
        if self.bot.extra_logging:
            print(f"[New Command] {ctx.author} created command `/{name}` in {ctx.guild.id}.")

    async def edit(
            self,
            ctx,
            name: str,
            reply: str = None,
            description: str = None,
    ) -> None:
        """Handles the `/edit` command.

        Args:
            ctx: Interaction.
            name (str): Existing command name.
            reply (str, optional): New command reply. Defaults to None.
            description (str, optional): New command description. Defaults to None.
        """
        if not await self.check_permissions(ctx):
            return

        name: str = name.lower()

        # This will probably never be used.
        if name == "no_commands_found":
            return await ctx.send(content="No commands were found. You can use `/add` to add a command.")

        # Checks if the fields are valid.
        if not await validate_input(ctx, name, reply, description):
            return

        # User ran the command without any arguments.
        if reply is None and description is None:
            return await ctx.send(
                content="So, you want to edit nothing? Either supply a reply, a description, or both.")

        # The command that's being edited doesn't exist.
        if not await self.bot.db.check_if_command_exists(ctx.guild.id, name):
            return await ctx.send(content="That command doesn't exist. Try `/add`-ing it first.")

        # Edit the command, which in turn returns the command ID.
        command_id: int = await self.bot.db.edit_existing_command(ctx.guild.id, name, reply, description)

        # Updating the description needs an API call.
        if description is not None:
            await ctx.guild.edit_application_command(
                Object(id=command_id),
                description=description,
            )

        # User feedback.
        msg: str = f"The command `/{name}` has been edited."
        if reply is not None:
            msg += f"\nNew Reply: _{reply}_"
        if description is not None:
            msg += f"\nNew Description: _{description}_"

        # Delete the command from the cache.
        if self.cached_commands.get(ctx.guild.id) is not None and self.cached_commands[ctx.guild.id].get(
                name) is not None:
            self.cached_commands[ctx.guild.id].pop(name, None)

        await ctx.send(content=msg)
        if self.bot.extra_logging:
            print(f"[Edited Command] {ctx.author} edited command `/{name}` in {ctx.guild.id}.")

    async def remove(self, ctx, name: str) -> None:
        """Handles the `/remove` command

        Args:
            ctx: Interaction.
            name (str): Command to remove.
        """
        if not await self.check_permissions(ctx):
            return

        name: str = name.lower()

        # This will probably never be used.
        if name == "no_commands_found":
            return await ctx.send(content="No commands were found. You can use `/add` to add a command.")

        # Checks if the fields are valid.
        if not await validate_input(ctx, name):
            return

        # The command that's being removed doesn't exist.
        if not await self.bot.db.check_if_command_exists(ctx.guild.id, name):
            return await ctx.send(content="That command doesn't exist. Try `/add`-ing it first.")

        # Remove the command, which in turn returns the command ID.
        command_id: int = await self.bot.db.remove_existing_command(ctx.guild.id, name)

        # Remove the command from the API using the command ID.
        await ctx.guild.delete_application_command(Object(id=command_id))

        # Delete the command from the cache.
        if self.cached_commands.get(ctx.guild.id) is not None and self.cached_commands[ctx.guild.id].get(
                name) is not None:
            self.cached_commands[ctx.guild.id].pop(name, None)

        # User feedback.
        await ctx.send(content=f"The command `/{name}` has been removed.")
        if self.bot.extra_logging:
            print(f"[Removed Command] {ctx.author} created command `/{name}` in {ctx.guild.id}.")

    async def list(self, ctx) -> None:
        """Handles the `/list` command.

        Args:
            ctx: Interaction.
        """
        # Get the commands from the database.
        commands: list[dict] = await self.bot.db.get_commands(ctx.guild.id)

        # If there are no commands, alert the user.
        if not commands:
            return await ctx.send(content="There are no commands in this server.\nGive `/add`-ing a shot.")

        # Embed template
        page: int = 1
        page_size: int = len(commands) // 20
        embed: Embed = await setup_embed(page=page, page_size=page_size)

        # Create and send the embed(s).
        for fields, command in enumerate(commands):
            if fields != 0 and fields % 20 == 0:
                await ctx.send(embed=embed, ephemeral=True)
                page += 1
                embed = await setup_embed(page=page, page_size=page_size)
            embed.add_field(
                name=f"__{command[0]}__",
                value=f"{command[1]}\nUses: {command[2]}",
                inline=True,
            )
        return await ctx.send(embed=embed, ephemeral=True)

    async def stats(self, ctx) -> None:
        """Handles the `/stats` command.

        Args:
            ctx (): Interaction
        """
        embed: Embed = Embed(
            color=0x00FF00,
            description="Just a summary of Slashy's stats."
                        + ("\nRun the command in a server to get into the specifics." if ctx.guild is None else ""),
            title="Slashy - Stats",
            url="https://hey.imkez.com/slashy-code",
        )
        embed.set_author(
            name="from Kez",
            url="https://hey.imkez.com/slashy-invite",
            icon_url=AVATAR,
        )
        embed.set_thumbnail(url=LOGO)
        embed.set_footer(text="This footer says hi!")
        embed.add_field(
            name="__Servers__",
            value=(
                    f"Hanging out in **{len(self.bot.guilds)}** servers, with **{sum(i.member_count for i in self.bot.guilds)}** users."
                    + ("\nYou're one of them!" if ctx.guild is not None else "")
            ),
            inline=False,
        )

        embed.add_field(
            name="__Commands__",
            value=f"Handling a total of **{await self.bot.db.get_number_of_commands()}** custom commands."
                  + (
                      f"\n**{await self.bot.db.get_number_of_commands(ctx.guild.id)}** of them are in this server." if ctx.guild else ""),
            inline=False,
        )
        embed.add_field(
            name="__Uses__",
            value=f"I've ran **{await self.bot.db.get_global_command_usage()}** commands globally."
                  + (
                      f"\n**{await self.bot.db.get_global_command_usage(ctx.guild.id)}** of them were in this server." if ctx.guild else ""),
            inline=False,
        )
        await ctx.send(embed=embed, ephemeral=True)

    async def config(self, ctx, permission: str) -> None:
        for key, value in iter(ctx.author.guild_permissions):
            if key == "administrator" and not value:
                return await ctx.send(
                    content="You don't have the required permissions to use this command (Administrator)")

        if permission is not None:
            await self.bot.db.set_permission(ctx.guild.id, permission)
            return await ctx.send(f"Permission successfully set to `{permission.upper()}`")
        return await ctx.send(f"Permission is currently `{(await self.bot.db.get_permission(ctx.guild.id)).upper()}`")

    # Handles autocompletion in /remove and /edit
    @Cog.listener()
    async def on_autocomplete_interaction(self, interaction):
        if interaction.application_id != self.bot.application_id:
            return

        # Stores a temporary copy of guild commands since I don't want to spam the database.
        # Remakes it if it's older than 60 seconds. That's enough time, right?
        if self.commands.get(interaction.guild.id) is None or (
                datetime.now() - self.commands[interaction.guild.id]["edited_at"]) > timedelta(
                minutes=1
        ):
            self.commands[interaction.guild.id] = {
                "commands": await self.bot.db.get_commands(
                    interaction.guild.id,
                    name_only=True,
                ),
                "edited_at": datetime.now(),
            }

        # If the server has no commands, don't bother.
        if not self.commands[interaction.guild.id]["commands"]:
            try:
                return await interaction.response.send_autocomplete(
                    [
                        ApplicationCommandOptionChoice(
                            name="This server doesn't have any commands...",
                            value="no_commands_found",
                        )
                    ]
                )
            except NotFound:
                return

        # Get the search query and respond with matches.
        for option in interaction.data["options"][0]["options"]:
            if option.get("focused"):
                query: str = option.get("value")
                if not query:
                    return

                # Up to 20 results - revolutionary I tell you!
                matches: list[str] = [command for command in self.commands[interaction.guild.id]["commands"] if
                                      query in command][:20]

                try:
                    return await interaction.response.send_autocomplete(
                        [
                            ApplicationCommandOptionChoice(
                                name=command,
                                value=command,
                            )
                            for command in sorted(matches, key=len)
                        ]
                    )
                except NotFound:
                    return


def setup(client):
    client.add_cog(CommandHandler(client))
