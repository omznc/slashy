from json import load
from logging import warning

import discord
from discord.errors import HTTPException
from discord.ext import commands

config: dict = load(open('config.json'))
LOGO: str = config["BOT_LOGO"]
MAX_COMMANDS_DEFAULT: str = config["MAX_COMMANDS_DEFAULT"]
OWNER_ID: int = config["OWNER_ID"]

# noinspection PyUnresolvedReferences
class CommandDeclarator(commands.Cog):
    """Cog for handling the reserved commands."""
    def __init__(self, bot):
        self.bot: discord.Client = bot
        self.commands = {}

    @commands.group()
    @commands.defer(ephemeral=True)
    async def slashy(self, ctx):
        """Command group for slashy's commands."""
        pass

    @slashy.command(name="add")
    @commands.defer(ephemeral=True)
    @commands.guild_only()
    @commands.cooldown(50, 86400, commands.BucketType.guild)  # 50 uses per 24 hours, per Discord server.
    async def add(self, ctx, name: str, reply: str, description: str = "A command made by Slashy"):
        await self.bot.worker.add(ctx, name, reply, description)

    @slashy.command(name="edit")
    @commands.defer(ephemeral=True)
    @commands.guild_only()
    @commands.cooldown(50, 86400, commands.BucketType.guild)  # 50 uses per 24 hours, per Discord server.
    async def edit(self, ctx, name: str, reply: str = None, description: str = None):
        await self.bot.worker.edit(ctx, name, reply, description)

    @slashy.command(name="remove")
    @commands.defer(ephemeral=True)
    @commands.guild_only()
    @commands.cooldown(50, 86400, commands.BucketType.guild)  # 50 uses per 24 hours, per Discord server.
    async def remove(self, ctx, name: str):
        await self.bot.worker.remove(ctx, name)

    @slashy.command(name="list")
    @commands.guild_only()
    @commands.defer(ephemeral=True)
    async def list(self, ctx):
        await self.bot.worker.list(ctx)

    @slashy.command(name="config")
    @commands.guild_only()
    @commands.defer(ephemeral=True)
    async def config(self, ctx, permission: str = None):
        await self.bot.worker.config(ctx, permission)

    @slashy.command(name="stats")
    @commands.defer(ephemeral=True)
    async def stats(self, ctx):
        await self.bot.worker.stats(ctx)

    @slashy.command(name="help")
    @commands.defer(ephemeral=True)
    async def help(self, ctx):
        await self.bot.worker.help(ctx)

    # Listener that handles all the commands.
    @commands.Cog.listener()
    async def on_slash_command(self, interaction):
        if interaction.application_id != self.bot.application_id:
            return

        # If it's not a reserved command, handle the custom output.
        # If it is, pass it to Novus.
        if interaction.command_name not in self.bot.reserved_commands:
            return await self.bot.worker.run_user_command(interaction)

    # Error handling.
    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        # Guild-only command ran in a DM.
        if isinstance(error, commands.errors.NoPrivateMessage):
            return await ctx.send(
                "This command can only be run in servers.",
                ephemeral=True,
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
            except KeyError:
                warning(f"{ctx.command_name} failed with **{error}**")
            finally:
                await self.bot.get_user(OWNER_ID).send(
                    f"Command failed with: **{error}**"
                )
                await ctx.send(
                    "Something went wrong. We're on it!",
                    ephemeral=True,
                )


def setup(client):
    client.add_cog(CommandDeclarator(client))
