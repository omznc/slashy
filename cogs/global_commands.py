from discord.ext import commands
from discord import (
    ApplicationCommand,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ApplicationCommandOption,
)

class global_commands(commands.Cog):
    """
    Cog for handling the help command.
    """

    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self):
        new_commands = [
            ApplicationCommand(
                name="add",
                description="[ADMIN] Add a custom command.",
                type=ApplicationCommandType.chat_input,
                options=[
                    ApplicationCommandOption(
                        name="name",
                        description="What's the name of the command?",
                        type=ApplicationCommandOptionType.string,
                    ),
                    ApplicationCommandOption(
                        name="reply",
                        description="What will the command reply?",
                        type=ApplicationCommandOptionType.string,
                    ),
                    ApplicationCommandOption(
                        name="description",
                        description="What's the description of the command?",
                        type=ApplicationCommandOptionType.string,
                        required=False,
                    ),
                ],
            ),
            ApplicationCommand(
                name="edit",
                description="[ADMIN] Edit an existing custom command.",
                type=ApplicationCommandType.chat_input,
                options=[
                    ApplicationCommandOption(
                        name="name",
                        description="What's the name of the command you want to edit?",
                        type=ApplicationCommandOptionType.string,
                        autocomplete=True,
                    ),
                    ApplicationCommandOption(
                        name="reply",
                        description="What will the command reply now?",
                        type=ApplicationCommandOptionType.string,
                        required=False,
                    ),
                    ApplicationCommandOption(
                        name="description",
                        description="What's the description of the command now?",
                        type=ApplicationCommandOptionType.string,
                        required=False,
                    ),
                ],
            ),
            ApplicationCommand(
                name="remove",
                description="[ADMIN] Remove an existing custom command.",
                type=ApplicationCommandType.chat_input,
                options=[
                    ApplicationCommandOption(
                        name="name",
                        description="What's the name of the command you want to remove?",
                        type=ApplicationCommandOptionType.string,
                        autocomplete=True,
                    )
                ],
            ),
            ApplicationCommand(
                name="list",
                description="List all custom commands for this server.",
                type=ApplicationCommandType.chat_input,
            ),
            ApplicationCommand(
                name="help",
                description="Get help on how to use Slashy",
                type=ApplicationCommandType.chat_input,
            ),
            ApplicationCommand(
                name="slashystats",
                description="Some stats about the Bot",
                type=ApplicationCommandType.chat_input,
            ),
        ]
        current_commands = await self.bot.fetch_global_application_commands()
        if [x for x in new_commands if x not in current_commands]:
            print("[Global Commands] Change detected. Updating...")
            await self.bot.bulk_create_global_application_commands(new_commands)
            print("[Global Commands] Updated!")


def setup(client):
    client.add_cog(global_commands(client))
