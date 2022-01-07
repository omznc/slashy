from discord import Game
from discord.ext.commands import Bot
from json import load
from logging import basicConfig, WARNING
from os import listdir, rename

basicConfig(
    filename="slashy.log",
    format="%(asctime)s : %(name)s - %(levelname)s - %(message)s",
    level=WARNING,
)

# The command_prefix is here to prevent non application commands
client = Bot(command_prefix="slashybutasacommandprefix", help_command=None)

config = load(open("config.json"))
TOKEN, NOWPLAYING = config["TOKEN"], config["NOWPLAYING"]

if not TOKEN:
    print("You need to set the token (and most other things) in config.json")
    exit()


@client.event
async def on_ready():
    await client.change_presence(activity=Game(name=NOWPLAYING))

    """
    Initial command publishing
    Will be changed as soon as Novus adds an easier options system to commands
    Runs only once to register the commands.
    """
    if "commands.json" in listdir("."):
        with open("commands.json", "r", encoding="utf-8") as f:
            commands = load(f)

        await client.http.bulk_upsert_global_commands(
            client.application_id, commands["commands"]
        )
        rename("commands.json", "commands.json.old")

    print(f"{client.user} Connected to {len(client.guilds)} servers.")


# Load cogs when run, with DB first
extensions = [
    "cogs.db",
    *[
        f"cogs.{file[:-3]}"
        for file in listdir("./cogs")
        if file.endswith(".py") and "db" not in file
    ],
]
for extension in extensions:
    client.load_extension(extension)
    print(f"Loaded {extension}")

client.run(TOKEN)
