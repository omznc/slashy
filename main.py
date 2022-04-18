from json import load
from logging import basicConfig, WARNING
from os import listdir

from discord import Game
from discord.ext.commands import Bot

basicConfig(
    filename="slashy.log",
    format="%(asctime)s : %(name)s - %(levelname)s - %(message)s",
    level=WARNING,
)

# The command_prefix is here to prevent non application commands
client: Bot = Bot(command_prefix="slashybutasacommandprefix", help_command=None)

client.is_production = False
client.extra_logging = True

config = load(open("config.json"))
TOKEN: str = (
    config["TOKEN"]["PRODUCTION"]
    if client.is_production
    else config["TOKEN"]["DEVELOPMENT"]
)
NOWPLAYING: str = config["NOWPLAYING"]

if not TOKEN:
    exit("You need to set the token (and most other things) in config.json")

print(f"--- Running in {'Production' if client.is_production else 'Development'} mode ---")


@client.event
async def on_ready():
    await client.change_presence(activity=Game(name=NOWPLAYING))
    print(f"{client.user} Connected to {len(client.guilds)} servers.")


# Load cogs when run, with DB first
extensions: list[str] = [
    "cogs.database",
    *[
        f"cogs.{file[:-3]}"
        for file in listdir("./cogs")
        if file.endswith(".py") and "database" not in file
    ],
]

for extension in extensions:
    client.load_extension(extension)
    print(f"Loaded {extension}")

client.run(TOKEN)
