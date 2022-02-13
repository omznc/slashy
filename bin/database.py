import aiomysql
from logging import warning
from json import load

from warnings import filterwarnings

filterwarnings("ignore", category=aiomysql.Warning)

DB_CONFIG = load(open("config.json"))["DATABASE_SETTINGS"]


class Database:
    """
    Database methods.
    """

    def __init__(self):
        self.__host = DB_CONFIG["host"]
        self.__user = DB_CONFIG["user"]
        self.__database = DB_CONFIG["database"]
        self.started = False

    async def addNewGuilds(self, guild_ids: list[int]) -> None:
        """
        Adds multiple guilds to guildSettings, only if the guild_id row doesn't exist.
        Runs once on bot startup.
        
        Args:
            guild_id (int): Discord server's ID
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.executemany(
                    """
                    INSERT IGNORE INTO guildSettings (guild_id)
                    VALUES (%s)
                    """,
                    guild_ids,
                )

    async def addNewGuild(self, guild_id: int) -> None:
        """Adds a new guild to guildSettings, only if the guild_id row doesn't exist.
        
        Args:
            guild_id (int): Discord server's ID
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    INSERT IGNORE INTO guildSettings (guild_id)
                    VALUES (%s)
                    """,
                    (guild_id,),
                )

    async def removeGuild(self, guild_id: int) -> None:
        """Removes the guild from the settings table, and all its commands.
        
        Args:
            guild_id (int): Discord server's ID
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    DELETE FROM guildSettings
                    WHERE guild_id = %s
                    """,
                    (guild_id,),
                )
                await cur.execute(
                    """
                    DELETE FROM slashyCommands
                    WHERE guild_id = %s
                    """,
                    (guild_id,),
                )

    async def getAllGuildIDs(self) -> list[int]:
        """Gets all the guild_ids from the database.
        
        Returns:
            list[int]: List of guild_ids
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT guild_id FROM guildSettings
                    """
                )
                result = await cur.fetchall()
                return [x[0] for x in result]

    async def removeInactiveGuilds(self, guild_ids: list[int]) -> None:
        """
        Removes the guilds that the bot isn't in but that still exist in the database.
        Usually happens if the bot is offline when someone kicks it out.
        
        Args:
            guild_ids (list[int]): List of guild_ids
        """
        for guild in await self.getAllGuildIDs():
            if guild not in guild_ids:
                await self.removeGuild(guild)
                print(f"Removed guild {guild} (Removed from server)")

    async def setMaxCommands(self, guild_id: int, max_commands: int) -> None:
        """Sets the max commands for a guild.
        
        Args:
            guild_id (int): Discord server's ID
            max_commands (int): Maximum commands allowed
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE guildSettings
                    SET max_commands = %s
                    WHERE guild_id = %s
                    """,
                    (max_commands, guild_id),
                )

    async def getMaxCommands(self, guild_id: int) -> int:
        """
        Gets the command limit of a guild.
        
        Args:
            guild_id (int): Discord server's ID
        
        Returns:
            int: Maximum commands allowed
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT max_commands FROM guildSettings
                    WHERE guild_id = %s
                    """,
                    (guild_id,),
                )
                result = await cur.fetchone()
                return result[0]

    # I don't plan to use this yet, maybe ever.
    async def isPremium(self, guild_id: int) -> bool:
        """
        Checks if a guild is "Premium".
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT premium FROM guildSettings
                    WHERE guild_id = %s
                    """,
                    (guild_id,),
                )
                result = await cur.fetchone()
                return result is not None and result[0] == 1

    async def getGlobalCommandUsage(self, guild_id: int = None) -> int:
        """Returns the number of times slashy has been across a guild, or across all guilds.
        
        Args:
            guild_id (int, optional), : Discord server's ID
    
        Returns:
            int: Number of times custom commands have been ran
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                if guild_id is None:
                    await cur.execute(
                        """
                        SELECT SUM(uses) FROM slashyCommands
                        """
                    )
                else:
                    await cur.execute(
                        """
                        SELECT SUM(uses) FROM slashyCommands
                        WHERE guild_id = %s
                        """,
                        (guild_id,),
                    )
                result = await cur.fetchone()
                return result[0]

    async def getNumberOfCommands(self, guild_id: int = None) -> int:
        """Returns the number of commands in a guild, or across all servers.

        Args:
            guild_id (int, optional): Discord server's ID

        Returns:
            int: The number of commands in the guild
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                if guild_id is not None:
                    await cur.execute(
                        """
                        SELECT COUNT(*) FROM slashyCommands
                        WHERE guild_id = %s
                        """,
                        (guild_id,),
                    )
                else:
                    await cur.execute(
                        """
                        SELECT COUNT(*) FROM slashyCommands
                        """
                    )
                result = await cur.fetchone()
                return result[0]

    async def commandExists(self, guild_id: int, name: str) -> bool:
        """Checks if a command exists in the database.
        Lookup by name.

        Args:
            guild_id (int): Discord server's ID
            name (str): The name of the command

        Returns:
            bool: True if the command exists, False otherwise.
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT * FROM slashyCommands
                    WHERE guild_id = %s AND name = %s
                    """,
                    (guild_id, name),
                )
                result = await cur.fetchone()
                return result is not None

    async def addCommand(
        self,
        command_id: int,
        guild_id: int,
        name: str,
        reply: str,
        description: str,
    ) -> None:
        """Adds a command to the database to the specified guild.

        Args:
            command_id (int): Discord-provided command ID
            guild_id (int): Discord server's ID
            name (str): Command name
            reply (str): Reply of the command when invoked
            description (str): The description of the command
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO slashyCommands (
                        command_id,
                        guild_id,
                        name,
                        reply,
                        description
                    ) VALUES (%s,%s,%s,%s,%s)
                    """,
                    (command_id, guild_id, name, reply, description),
                )

    async def removeCommand(self, guild_id: int, name: str) -> int:
        """Removes a command from the database.
        Lookup by name.
        Returns the removed command ID.

        Returns:
            [int]: Discord-provided command ID
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT command_id FROM slashyCommands
                    WHERE guild_id = %s AND name = %s
                    """,
                    (guild_id, name),
                )
                result = await cur.fetchone()  # The command ID
                await cur.execute(
                    """
                    DELETE FROM slashyCommands
                    WHERE guild_id = %s AND name = %s
                    """,
                    (guild_id, name),
                )
                return result[0]

    async def editCommand(
        self, guild_id: int, name: str, reply: str = None, description: str = None
    ) -> int | None:
        """Edits a command in the database.
        Lookup by name.
        Returns the edited command id.

        Returns:
            [int]: Discord-provided command ID
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                if reply is None and description is not None:
                    await cur.execute(
                        """
                        UPDATE slashyCommands
                        SET description = %s
                        WHERE guild_id = %s AND name = %s

                        """,
                        (description, guild_id, name),
                    )
                elif reply is not None and description is None:
                    await cur.execute(
                        """
                        UPDATE slashyCommands
                        SET reply = %s
                        WHERE guild_id = %s AND name = %s
                        """,
                        (reply, guild_id, name),
                    )
                else:
                    await cur.execute(
                        """
                        UPDATE slashyCommands
                        SET reply = %s, description = %s
                        WHERE guild_id = %s AND name = %s
                        """,
                        (reply, description, guild_id, name),
                    )

                await cur.execute(
                    """
                    SELECT command_id FROM slashyCommands
                    WHERE guild_id = %s AND name = %s
                    """,
                    (guild_id, name),
                )
                result = await cur.fetchone()
                return None if result is None else result[0]

    async def incrementUses(self, guild_id: int, name: str) -> None:
        """Increments the uses of a command.
        TODO: Something more with this, probably.

        Args:
            guild_id (int): Discord server's ID
            name (str): Command name
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE slashyCommands
                    SET uses = uses + 1
                    WHERE guild_id = %s AND name = %s
                    """,
                    (guild_id, name),
                )

    async def getCommand(self, guild_id: int, name: str) -> str:
        """Returns the reply the command outputs when invoked.
        Lookup by name.

        Returns:
            [str]: The reply of the command when invoked
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT reply FROM slashyCommands
                    WHERE guild_id = %s AND name = %s
                    """,
                    (guild_id, name),
                )
                result = await cur.fetchone()
                return result[0]

    async def getCommands(self, guild_id: int, name_only: bool = False) -> list:
        """Returns names and descriptions of all commands in a guild.

        Args:
            guild_id (int): Discord server's ID
            name_only (bool, optional): If True, only returns names of commands.

        Returns:
            list: List of tuples containing the command name [0], description [1], and reply [2]
                  If name_only is True, returns a list of command names.
        """
        if not name_only:
            with await self.pool as con:
                async with con.cursor() as cur:
                    await cur.execute(
                        """
                        SELECT name, description, uses FROM slashyCommands
                        WHERE guild_id = %s
                        """,
                        (guild_id,),
                    )
                    result = await cur.fetchall()
                    return result
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    SELECT name FROM slashyCommands
                    WHERE guild_id = %s
                    """,
                    (guild_id,),
                )
                result = await cur.fetchall()
                result = [x[0] for x in result]
                return result

    async def start(self) -> bool:
        """Connects to the database.
        
        Returns:
            bool: True if connection was successful, False otherwise
        """
        try:
            # Connect
            self.pool = await aiomysql.create_pool(
                host=self.__host,
                user=self.__user,
                password=DB_CONFIG["password"],
                db=self.__database,
                autocommit=True,
            )
        except:
            self.started = False
            return self.started

        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS slashyCommands (
                        command_id BIGINT UNSIGNED PRIMARY KEY,
                        guild_id BIGINT UNSIGNED,
                        name TEXT DEFAULT NULL,
                        reply TEXT DEFAULT NULL,
                        description TEXT DEFAULT NULL,
                        uses INT UNSIGNED DEFAULT 0
                    )
                    """
                )
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS guildSettings (
                        guild_id BIGINT UNSIGNED PRIMARY KEY,
                        premium TINYINT UNSIGNED DEFAULT 0,
                        max_commands INT UNSIGNED DEFAULT 30
                    )
                    """
                )
                self.started = True
        return self.started

    async def ping(self) -> None:
        """
        Pings the database.
        Ignore me.
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                try:
                    self.started = await cur.execute("SELECT 1") == 1
                except Exception as e:
                    warning(e)
                    self.started = False
                    self.start()
