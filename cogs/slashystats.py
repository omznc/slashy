from os import name
from discord import Embed
from discord.ext import commands
from logging import warning
from json import load

config = load(open("config.json"))
LOGO = config["BOT_LOGO"]  # Slashy's logo.
AVATAR = config["KEZ_AVATAR"]  # My, the developer's avatar.


class SlashyStats(commands.Cog):
    """
    Cog for handling the help command.
    """

    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.defer(ephemeral=True)
    async def slashystats(self, ctx):
        embed = Embed(
            color=0x00FF00,
            description="Just a summary of Slashy's stats."
            + (
                "\nRun the command in a server to get into the specifics."
                if ctx.guild is None
                else ""
            ),
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
            value=f"Handling a total of **{await self.bot.db.getNumberOfCommands()}** custom commands."
            + (
                f"\n**{await self.bot.db.getNumberOfCommands(ctx.guild.id)}** of them are in this server."
                if ctx.guild
                else ""
            ),
            inline=False,
        )
        embed.add_field(
            name="__Uses__",
            value=f"I've ran **{await self.bot.db.getGlobalCommandUsage()}** commands globally."
            + (
                f"\n**{await self.bot.db.getGlobalCommandUsage(ctx.guild.id)}** of them were in this server."
                if ctx.guild
                else ""
            ),
            inline=False,
        )
        await ctx.send(embed=embed, ephemeral=True)

    # Error handling.
    @slashystats.error
    async def slashystats_serror(self, ctx, error):
        await ctx.send(
            "There's been an issue with your command." "\nGive it another shot."
        )
        warning(f"Command: {ctx.command}\nError: {error}")


def setup(client):
    client.add_cog(SlashyStats(client))
