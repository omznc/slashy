from discord.ext import commands, tasks

from bin.database import Database


class DB(commands.Cog):
    """
    Discord.py cog for loading database methods.

    Notes
    -----
    The database can be accessed via
    the `.bot.db` variable.
    """

    def __init__(self, bot):
        self.bot = bot
        self.bot.db = Database()
        self.ping.start()

    def cog_unload(self):
        self.bot.db.pool.close()

    @tasks.loop(hours=4)
    async def ping(self):
        """
        This just pings the database every 4 hours.
        """
        if not self.bot.db.started:
            await self.bot.db.start()
        # Ping command
        await self.bot.db.ping()


def setup(client):
    client.add_cog(DB(client))
