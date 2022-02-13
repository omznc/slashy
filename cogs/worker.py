from ast import Return
from discord.errors import HTTPException, NotFound
from discord.ext import commands
from discord import (
    Embed,
    ApplicationCommandOptionChoice,
    ApplicationCommandType,
    Object,
    ApplicationCommand,
)
from logging import warning
from json import load
from datetime import datetime, timedelta


config = load(open("config.json"))
LOGO, MAX_COMMANDS_DEFAULT = (
    config["BOT_LOGO"],
    config["MAX_COMMANDS_DEFAULT"],
)  # MAX_COMMANDS_DEFAULT is the maximum amount of commands that can be registered to a server.
RESERVED_COMMANDS = {
    "add",
    "remove",
    "edit",
    "list",
    "help",
    "slashystats",
}  # These command names are reserved to prevent confusion with custom ones.


class Worker(commands.Cog):
    """
    Cog for handling the reserved commands.
    """

    def __init__(self, bot):
        self.bot = bot
        self.commands = {}

    async def userCommand(self, ctx) -> None:
        """Figures out what reply to send for custom commands.

        Args:
            ctx (discord.Interaction): Interaction that we're responding to.
        """
        await ctx.response.defer()

        # All the possible reply parameters.
        placeholders = {
            "[[user]]": ctx.user.mention,
            "[[user.id]]": ctx.user.id,
            "[[user.name]]": ctx.user.name,
            "[[user.avatar]]": ctx.user.avatar.url,
            "[[server]]": ctx.guild.name,
            "[[server.id]]": ctx.guild.id,
            "[[server.icon]]": ctx.guild.icon.url,
            "[[server.member_count]]": ctx.guild.member_count,
            "[[channel]]": ctx.channel.name,
        }

        # Get the reply from the database and replace placeholders.
        reply = await self.bot.db.getCommand(ctx.guild.id, ctx.command_name)
        if reply is None:
            return await ctx.edit_original_message(
                content="That command doesn't exist."
            )
        for placeholder in placeholders:
            reply = reply.replace(placeholder, str(placeholders[placeholder]))

        # This is here because I'm paranoid.
        try:
            await ctx.edit_original_message(content=reply)
            await self.bot.db.incrementUses(ctx.guild.id, ctx.command_name)

        except Exception as error:
            await ctx.edit_original_message(
                content="There was an error with this command. We'll fix it soon."
            )
            warning(f"{ctx.command_name} failed with {error}")

    async def checkInputValidity(
        self, ctx, name: str = None, reply: str = None, description: str = None
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
        if name is not None and (
            (len(name) > 32 or not name.isalpha() or not name.isascii())
            or name.isnumeric()
        ):
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
                content="The reply of the command must be less than or equal **2000** characters."
                f"\nYours was **{len(reply)}** characters long."
            )
            return False

        return True

    async def setupEmbed(self, page: int, page_size: int) -> Embed:
        """Sets up the Embed for the list command.

        Args:
            page (int): Current page of the command embed.
            page_size (int): The total amount of pages that the embed has.

        Returns:
            Embed: Discord.Embed object.
        """

        embed = Embed(title=f"Commands ({page}/{page_size+1})")
        embed.set_thumbnail(url=LOGO)
        embed.set_footer(text="Slashy says Hi!")
        return embed

    # Below this point are the bot-reserved commands.
    @commands.command()
    @commands.defer(ephemeral=True)
    @commands.has_guild_permissions(administrator=True)
    @commands.cooldown(
        50, 86400, commands.BucketType.guild
    )  # 50 uses per 24 hours, per Discord server.
    async def add(
        self, ctx, name: str, reply: str, description: str = "A command made by Slashy"
    ) -> None:
        name = name.lower()

        if not await self.checkInputValidity(ctx, name, reply, description):
            return

        if await self.bot.db.commandExists(ctx.guild.id, name):
            return await ctx.send(
                content="A command with that name already exists. You can use `/edit` to edit it, or `/remove` to remove it."
            )
        MAX_COMMANDS = await self.bot.db.getMaxCommands(ctx.guild.id)
        if MAX_COMMANDS is None:
            await self.bot.db.addNewGuild(ctx.guild.id)
            MAX_COMMANDS = MAX_COMMANDS_DEFAULT

        if await self.bot.db.getNumberOfCommands(ctx.guild.id) >= MAX_COMMANDS:
            return await ctx.send(
                content=f"You have reached the maximum number of **Slashy** commands ({MAX_COMMANDS}) for your server."
                "\nPlease remove some before adding more. 🙂"
                "\nThis limit will be incerased in the future."
            )
        response = await ctx.guild.create_application_command(
            ApplicationCommand(
                name=name,
                description=description,
                type=ApplicationCommandType.chat_input,
            )
        )

        # Add the command to the database.
        await self.bot.db.addCommand(
            response.id, ctx.guild.id, name, reply, description
        )

        await ctx.send(content=f"The command `/{name}` has been created.")

    @commands.command()
    @commands.defer(ephemeral=True)
    @commands.has_guild_permissions(administrator=True)
    @commands.cooldown(
        50, 86400, commands.BucketType.guild
    )  # 50 uses per 24 hours, per Discord server.
    async def edit(
        self, ctx, name: str, reply: str = None, description: str = None
    ) -> None:
        name = name.lower()

        # This will probably never be used.
        if name == "no_commands_found":
            return await ctx.send(
                content="No commands were found. You can use `/add` to add a command."
            )

        # Checks if the fields are valid.
        if not await self.checkInputValidity(ctx, name, reply, description):
            return

        # User ran the command without any arguments.
        if reply is None and description is None:
            return await ctx.send(
                content="So, you want to edit nothing? Either supply a reply, a description, or both."
            )

        # The command that's being edited doesn't exist.
        if not await self.bot.db.commandExists(ctx.guild.id, name):
            return await ctx.send(
                content="That command doesn't exist. Try `/add`-ing it first."
            )

        # Edit the command, which in turn returns the command ID.
        commandID = await self.bot.db.editCommand(
            ctx.guild.id, name, reply, description
        )

        # Updating the description needs an API call.
        if description is not None:
            await ctx.guild.edit_application_command(
                Object(id=commandID), description=description
            )

        # User feedback.
        msg = f"The command `/{name}` has been edited."
        if reply is not None:
            msg += f"\nNew Reply: _{reply}_"
        if description is not None:
            msg += f"\nNew Description: _{description}_"

        await ctx.send(content=msg)

    @commands.command()
    @commands.defer(ephemeral=True)
    @commands.has_guild_permissions(administrator=True)
    @commands.cooldown(
        50, 86400, commands.BucketType.guild
    )  # 50 uses per 24 hours, per Discord server.
    async def remove(self, ctx, name: str) -> None:
        name = name.lower()

        # This will probably never be used.
        if name == "no_commands_found":
            return await ctx.send(
                content="No commands were found. You can use `/add` to add a command."
            )

        # Checks if the fields are valid.
        if not await self.checkInputValidity(ctx, name):
            return

        # The command that's being removed doesn't exist.
        if not await self.bot.db.commandExists(ctx.guild.id, name):
            return await ctx.send(
                content="That command doesn't exist. Try `/add`-ing it first."
            )

        # Remove the command, which in turn returns the command ID.
        commandID = await self.bot.db.removeCommand(ctx.guild.id, name)

        # Remove the command from the API using the command ID.
        await ctx.guild.delete_application_command(Object(id=commandID))

        # User feedback.
        await ctx.send(content=f"The command `/{name}` has been removed.")

    @commands.command()
    @commands.guild_only()
    @commands.defer(ephemeral=True)
    async def list(self, ctx) -> None:

        # Get the commands from the database.
        commands = await self.bot.db.getCommands(ctx.guild.id)

        # If there are no commands, alert the user.
        if len(commands) == 0:
            return await ctx.send(
                content="There are no commands in this server.\nGive `/add`-ing a shot."
            )

        # Embed template
        page = 1
        page_size = len(commands) // 20
        embed = await self.setupEmbed(page=page, page_size=page_size)

        # Create and send the embed(s).
        for fields, command in enumerate(commands):
            if fields != 0 and fields % 20 == 0:
                await ctx.send(embed=embed, ephemeral=True)
                page += 1
                embed = await self.setupEmbed(page=page, page_size=page_size)
            embed.add_field(
                name=f"__{command[0]}__",
                value=f"{command[1]}\nUses: {command[2]}",
                inline=True,
            )
        return await ctx.send(embed=embed, ephemeral=True)

    # Handles autocompletion in /remove and /edit
    @commands.Cog.listener()
    async def on_autocomplete_interaction(self, interaction):

        # Stores a temporary copy of guild commands since I don't want to spam the database.
        # Remakes it if it's older than 60 seconds. That's enough time, right?
        if self.commands.get(interaction.guild.id) is None or (
            datetime.now() - self.commands[interaction.guild.id]["edited_at"]
        ) > timedelta(minutes=1):
            self.commands[interaction.guild.id] = {
                "commands": await self.bot.db.getCommands(
                    interaction.guild.id, name_only=True
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
        for option in interaction.data["options"]:
            if option.get("focused"):
                query = option.get("value")
                if len(query) == 0:
                    return

                # Up to 20 results - revolutionary I tell you!
                matches = [
                    command
                    for command in self.commands[interaction.guild.id]["commands"]
                    if query in command
                ][:20]
                
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

    # Listener that handles all the commands.
    @commands.Cog.listener()
    async def on_slash_command(self, interaction):

        # If it's not a reserved command, handle the custom output.
        if interaction.command_name not in RESERVED_COMMANDS:
            return await self.userCommand(interaction)

        # If it is, Novus handles it, so we do nothing.

    # Error handling.
    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):

        # Missing permissions.
        if isinstance(error, commands.errors.MissingPermissions):
            return await ctx.send(
                "This command is only for administrators.", ephemeral=True
            )

        # Guild-only command ran in a DM.
        if isinstance(error, commands.errors.NoPrivateMessage):
            return await ctx.send(
                "This command can only be run in servers.", ephemeral=True
            )

        # Discord's maximum commands limit of 100.
        if isinstance(error, HTTPException) and error.code == 30032:
            return await ctx.send(
                "This server has reached the maximum number of commands allowed by Discord (100)."
                "\nPlease remove some before adding more.",
                ephemeral=True,
            )

        # Everything else.
        if not isinstance(error, commands.CommandNotFound):
            try:
                warning(f"{ctx.command} failed with **{error}**")
            except:  # Yes, bare except. No, I don't care.
                warning(f"{ctx.command_name} failed with **{error}**")
            return await ctx.send(
                "Something went wrong. Please let @Kez#6673 know."
                "\nError is as follows:"
                "\n```"
                f"\n{error}"
                "\n```",
                ephemeral=True,
            )


def setup(client):
    client.add_cog(Worker(client))
