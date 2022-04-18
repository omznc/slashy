from asyncio import sleep
from json import load
from discord.ext import tasks
from discord.ext.commands import Cog

from bin.database_class import DB


class Database(Cog):
    """
    Discord.py cog for loading database methods.

    Notes
    -----
    The database can be accessed via
    the `.bot.db` variable.
    """

    def __init__(self, bot):
        self.bot = bot
        self.bot.db = DB(
            load(open("config.json"))["DATABASE_SETTINGS"]["PRODUCTION"]
            if self.bot.is_production
            else load(open("config.json"))["DATABASE_SETTINGS"]["DEVELOPMENT"]
        )
        self.ping.start()

    def cog_unload(self):
        self.bot.db.pool.close()

    @Cog.listener()
    async def on_ready(self):
        await self.bot.db.add_new_guilds([guild.id for guild in self.bot.guilds])
        print("[Database] Updated Guild List\n[Database] Removing inactive guilds...")
        await self.bot.db.remove_inactive_guilds([guild.id for guild in self.bot.guilds])
        print("[Database] Done!")

    @Cog.listener()
    async def on_guild_join(self, guild):
        await self.bot.db.add_new_guild(guild.id)
        print(f"[Guild] Joined {guild.name} ({guild.id}) -> {guild.member_count} Members.")

    @Cog.listener()
    async def on_guild_remove(self, guild):
        await self.bot.db.remove_guild(guild.id)
        print(f"[Guild] Left {guild.name} ({guild.id}) -> {guild.member_count} Members.")

    @tasks.loop(minutes=30)
    async def ping(self):
        """
        This just pings the database every 4 hours.
        """
        if not self.bot.db.started and not await self.bot.db.start():
            n: int = 1
            while True:
                if await self.bot.db.start():
                    print("[Database] Connection successful!")
                    break
                else:
                    print(f"[Database] Database failed to start. Retrying... ({n})")
                    n += 1
                    await sleep(30)

        # Ping command
        await self.bot.db.ping()


def setup(client):
    client.add_cog(Database(client))
