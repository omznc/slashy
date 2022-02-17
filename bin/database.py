from json import load
from logging import warning
from warnings import filterwarnings
import aiomysql

filterwarnings("ignore", category=aiomysql.Warning)

DB_CONFIG: dict = load(open("config.json"))["DATABASE_SETTINGS"]["PRODUCTION"]


# noinspection SqlInjection // SQL injection is not possible here because we are using prepared statements.
class Database:
    """
    Database methods.
    """

    def __init__(self):
        self.__host: str = DB_CONFIG["host"]
        self.__user: str = DB_CONFIG["user"]
        self.__database: str = DB_CONFIG["database"]
        self.started: bool = False

    async def query(self, query: str) -> any:
        """
        Runs a query on the database.
        This is only used for queries that have custom user input.

        Args:
            query (str): Query to run

        Returns:
            any: Result of the query
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(query)
                return await cur.fetchall()

    async def get_permission(self, guild_id: int) -> str:
        """Gets the permission setting of a guild.
        Defaults to `administrator` if it hasn't been set

        Args:
            guild_id (int): Discord server's ID

        Returns:
            permission (str): Permission
        """
        return (await self.query(f"SELECT permission FROM guildSettings WHERE guild_id = {guild_id}"))[0][0]

    async def set_permission(self, guild_id: int, permission: str) -> None:
        """Sets the permission setting of a guild.

        Args:
            guild_id (int): Discord server's ID
            permission (str): Permission value
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE guildSettings
                    SET permission = %s
                    WHERE guild_id = %s
                    """,
                    (permission, guild_id),
                )

    async def add_new_guilds(self, guild_ids: list[int]) -> None:
        """
        Adds multiple guilds to guildSettings, only if the guild_id row doesn't exist.
        Runs once on bot startup.

        Args:
            guild_ids (list[int]): Discord server's IDs
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

    async def add_new_guild(self, guild_id: int) -> None:
        """Adds a new guild to guildSettings, only if the guild_id row doesn't exist.

        Args:
            guild_id (int): Discord server's ID
        """
        await self.query(f"INSERT IGNORE INTO guildSettings (guild_id) VALUES ({guild_id})")

    async def remove_guild(self, guild_id: int) -> None:
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

    async def get_all_guild_ids(self) -> list[int]:
        """Gets all the guild_ids from the database.

        Returns:
            list[int]: List of guild_ids
        """
        return [guild[0] for guild in (await self.query("SELECT guild_id FROM guildSettings"))]

    async def remove_inactive_guilds(self, guild_ids: list[int]) -> None:
        """
        Removes the guilds that the bot isn't in but that still exists in the database.
        Usually happens if the bot is offline when someone kicks it out.

        Args:
            guild_ids (list[int]): List of guild_ids
        """
        for guild in await self.get_all_guild_ids():
            if guild not in guild_ids:
                await self.remove_guild(guild)
                print(f"Removed guild {guild} (Removed from server)")

    async def set_max_commands(self, guild_id: int, max_commands: int) -> None:
        """Sets the max commands for a guild.

        Args:
            guild_id (int): Discord server's ID
            max_commands (int): Maximum commands allowed
        """
        await self.query(f"UPDATE guildSettings SET max_commands = {max_commands} WHERE guild_id = {guild_id}")

    async def get_max_commands(self, guild_id: int) -> int:
        """
        Gets the command limit of a guild.

        Args:
            guild_id (int): Discord server's ID

        Returns:
            int: Maximum commands allowed
        """
        return (await self.query(f"SELECT max_commands FROM guildSettings WHERE guild_id = {guild_id}"))[0][0]

    # I don't plan to use this yet, maybe ever.
    async def is_premium(self, guild_id: int) -> bool:
        """
        Checks if a guild is "Premium".
        """
        return bool((await self.query(f"SELECT premium FROM guildSettings WHERE guild_id = {guild_id}"))[0][0])

    async def get_global_command_usage(self, guild_id: int = None) -> int:
        """Returns the number of times slashy has been across a guild, or across all guilds.

        Args:
            guild_id (int, optional), : Discord server's ID

        Returns:
            int: Number of times custom commands have been run
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
                return (await cur.fetchone())[0]

    async def get_number_of_commands(self, guild_id: int = None) -> int:
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
                return (await cur.fetchone())[0]

    async def check_if_command_exists(self, guild_id: int, name: str) -> bool:
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
                    SELECT COUNT(*) FROM slashyCommands
                    WHERE guild_id = %s
                    AND name = %s
                    """,
                    (guild_id, name),
                )
                return (await cur.fetchone())[0] != 0

    async def add_new_command(
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

    async def remove_existing_command(self, guild_id: int, name: str) -> int:
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

    async def edit_existing_command(
        self,
        guild_id: int,
        name: str,
        reply: str = None,
        description: str = None,
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
                        (
                            description,
                            guild_id,
                            name,
                        ),
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
                        (
                            reply,
                            description,
                            guild_id,
                            name,
                        ),
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

    async def increment_command_uses(self, guild_id: int, name: str) -> None:
        """Increments the uses of a command.

        Args:
            guild_id (int): Discord server's ID
            name (str): Command name
        """
        await self.query(f'UPDATE slashyCommands SET uses = uses + 1 WHERE guild_id = {guild_id} AND name = "{name}"')

    async def get_command(self, guild_id: int, name: str) -> str | None:
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
                return None if result is None else result[0]

    async def get_commands(
        self,
        guild_id: int,
        name_only: bool = False,
    ) -> list:
        """Returns names and descriptions of all commands in a guild.

        Args:
            guild_id (int): Discord server's ID
            name_only (bool, optional): If True, only returns names of commands.

        Returns:
            list: List of tuples containing the command name [0], description [1], and reply [2]
                  If name_only is True, returns a list of command names.
        """
        with await self.pool as con:
            async with con.cursor() as cur:
                if not name_only:
                    await cur.execute(
                        """
                        SELECT name, description, uses FROM slashyCommands
                        WHERE guild_id = %s
                        """,
                        (guild_id,),
                    )
                    return await cur.fetchall()

                await cur.execute(
                    """
                    SELECT name FROM slashyCommands
                    WHERE guild_id = %s
                    """,
                    (guild_id,),
                )
                return [x[0] for x in (await cur.fetchall())]

    async def start(self) -> bool:
        """Connects to the database.

        Returns:
            bool: True if connection was successful, False otherwise
        """
        try:
            # Connect
            # noinspection PyAttributeOutsideInit
            self.pool = await aiomysql.create_pool(
                host=self.__host,
                user=self.__user,
                password=DB_CONFIG["password"],
                db=self.__database,
                autocommit=True,
            )
        except Exception as e:
            print(f'[Database] Failed to connect: {e}')
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
                        max_commands INT UNSIGNED DEFAULT 30,
                        permission TEXT DEFAULT 'administrator'
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
                    await self.start()
