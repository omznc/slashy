from asyncio import sleep
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

    @tasks.loop(minutes=30)
    async def ping(self):
        """
        This just pings the database every 4 hours.
        """
        if not self.bot.db.started and not await self.bot.db.start():
            n = 1
            while True:
                if await self.bot.db.start():
                    print("Connection successful!")
                    break
                else:
                    print(f"Database failed to start. Retrying... ({n})")
                    n += 1
                    await sleep(30)

        # Ping command
        await self.bot.db.ping()


def setup(client):
    client.add_cog(DB(client))
