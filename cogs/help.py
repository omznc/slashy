from os import name
from discord import Embed
from discord.ext import commands
from logging import warning
from json import load

config = load(open("config.json"))
LOGO = config["BOT_LOGO"]  # Slashy's logo.
AVATAR = config["KEZ_AVATAR"]  # My, the developer's avatar.
RESERVED_COMMANDS = {
    "add",
    "remove",
    "edit",
    "list",
    "help",
    "slashystats",
}  # These command names are reserved to prevent confusion with custom ones.


class Help(commands.Cog):
    """
    Cog for handling the help command.
    """

    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.defer(ephemeral=True)
    async def help(self, ctx):
        embed = Embed(
            color=0x00FF00,
            description="Hey, I'm Slashy - your friendly neighborhood custom-command bot!"
            "\nBelow are all the commands you can use.",
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
            text="Check out the source code at https://hey.imkez.com/slashy-code",
        )
        embed.add_field(
            name="👑 __Add__",
            value="Used to add new slash commands."
            "\nThe description field is optional."
            "\n**Usage:** `/add <name> <reply> [description]`",
        )
        embed.add_field(
            name="👑 __Remove__",
            value="Used to remove existing slash commands."
            "\n**Usage:** `/remove <name>`",
        )
        embed.add_field(
            name="👑 __Edit__",
            value="Used to edit an existing command's reply, description, or both."
            "\n**Usage:** `/edit <name> [new-reply] [new-description]`",
        )
        embed.add_field(
            name="__List__",
            value="Used to list all of your server's commands." "\nUsage: `/list`",
        )
        embed.add_field(
            name="__SlashyStats__",
            value="Displays some Slashy statistics." "\nUsage: `/slashystats`",
        )
        embed.add_field(
            name="Notes",
            inline=False,
            value="`<>` are required arguments and `[]` are optional arguments."
            "\n👑 means the command can only be used by server administrators."
            f"\nThe following command names are reserved and can't be used to prevent confusion: `{'`, `'.join(RESERVED_COMMANDS)}`.",
        )
        await ctx.send(embed=embed, ephemeral=True)

    # Error handling.
    @help.error
    async def help_error(self, ctx, error):
        await ctx.send(
            "There's been an issue with your command." "Give it another shot."
        )
        warning(f"Command: {ctx.command}\nError: {error}")


def setup(client):
    client.add_cog(Help(client))
