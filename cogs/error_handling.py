from json import load
from logging import warning

from discord.errors import HTTPException
from discord.ext import commands

OWNER_ID: int = load(open("config.json"))["OWNER_ID"]


class ErrorHandling(commands.Cog):
    """
    Cog for handling errors.
    """

    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        # Guild-only command ran in a DM.
        if isinstance(error, commands.errors.NoPrivateMessage):
            return await ctx.send(
                "This command can only be run in servers.",
                ephemeral=True,
            )

        # Discord's maximum command limit of 100 per guild.
        if isinstance(error, HTTPException) and error.code == 30032:
            return await ctx.send(
                "This server has reached the maximum number of commands allowed by Discord (100)." "\nPlease remove some before adding more.",
                ephemeral=True,
            )

        # Everything else.
        if not isinstance(error, commands.CommandNotFound):
            try:
                warning(f"{ctx.command} failed with **{error}**")
            except KeyError:
                warning(f"{ctx.command_name} failed with **{error}**")
            finally:
                await (await self.bot.fetch_user(OWNER_ID)).send(f"Command failed with: ```py\n{error}\n```")
                await ctx.send(
                    "Something went wrong. We're on it!",
                    ephemeral=True,
                )


def setup(client):
    client.add_cog(ErrorHandling(client))
