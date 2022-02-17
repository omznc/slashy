import discord
from discord import Game
from discord.ext.commands import Bot
from json import load
from logging import basicConfig, WARNING
from os import listdir

basicConfig(
    filename="slashy.log",
    format="%(asctime)s : %(name)s - %(levelname)s - %(message)s",
    level=WARNING,
)

# The command_prefix is here to prevent non application commands
client: discord.ext.commands.Bot = Bot(command_prefix="slashybutasacommandprefix", help_command=None)

config = load(open("config.json"))
TOKEN: str = config["TOKEN"]["PRODUCTION"]
NOWPLAYING: str = config["NOWPLAYING"]

if not TOKEN:
    print("You need to set the token (and most other things) in config.json")
    exit()


@client.event
async def on_ready():
    await client.change_presence(activity=Game(name=NOWPLAYING))
    print(f"{client.user} Connected to {len(client.guilds)} servers.")

# Load cogs when run, with DB first
extensions: list[str] = [
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
