from discord import (
    ApplicationCommand,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ApplicationCommandOption,
    ApplicationCommandOptionChoice,
)
from discord.ext.commands import Cog


class CommandPublisher(Cog):
    """
    Cog for handling the help command.
    """

    def __init__(self, bot):
        self.bot, self.bot.reserved_commands = bot, []

    @Cog.listener()
    async def on_ready(self):
        commands = [
            ApplicationCommand(
                name="slashy",
                description="The category for slashy's commands.",
                type=ApplicationCommandType.chat_input,
                options=[
                    ApplicationCommandOption(
                        name="add",
                        description="[ADMIN] Add a custom command.",
                        type=ApplicationCommandOptionType.subcommand,
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
                    ApplicationCommandOption(
                        name="edit",
                        description="[ADMIN] Edit an existing custom command.",
                        type=ApplicationCommandOptionType.subcommand,
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
                    ApplicationCommandOption(
                        name="remove",
                        description="[ADMIN] Remove an existing custom command.",
                        type=ApplicationCommandOptionType.subcommand,
                        options=[
                            ApplicationCommandOption(
                                name="name",
                                description="What's the name of the command you want to remove?",
                                type=ApplicationCommandOptionType.string,
                                autocomplete=True,
                            )
                        ],
                    ),
                    ApplicationCommandOption(
                        name="config",
                        description="[ADMIN] Bot configuration.",
                        type=ApplicationCommandOptionType.subcommand,
                        options=[
                            ApplicationCommandOption(
                                name="permission",
                                description="What's the permission a user needs to use administrator commands?",
                                type=ApplicationCommandOptionType.string,
                                required=False,
                                choices=[
                                    ApplicationCommandOptionChoice(
                                        name="Administrator",
                                        value="administrator",
                                    ),
                                    ApplicationCommandOptionChoice(
                                        name="Manage Channels",
                                        value="manage_channels",
                                    ),
                                    ApplicationCommandOptionChoice(
                                        name="Manage Guild",
                                        value="manage_guild",
                                    ),
                                    ApplicationCommandOptionChoice(
                                        name="Manage Messages",
                                        value="manage_messages",
                                    ),
                                    ApplicationCommandOptionChoice(
                                        name="Manage Roles",
                                        value="manage_roles",
                                    ),
                                    ApplicationCommandOptionChoice(
                                        name="Moderate Members",
                                        value="moderate_members",
                                    ),
                                    ApplicationCommandOptionChoice(
                                        name="Manage Permissions",
                                        value="manage_permissions",
                                    ),
                                ],
                            )
                        ],
                    ),
                    ApplicationCommandOption(
                        name="list",
                        description="List all custom commands for this server.",
                        type=ApplicationCommandOptionType.subcommand,
                    ),
                    ApplicationCommandOption(
                        name="help",
                        description="Get help on how to use Slashy.",
                        type=ApplicationCommandOptionType.subcommand,
                    ),
                    ApplicationCommandOption(
                        name="stats",
                        description="Some stats about the Bot",
                        type=ApplicationCommandOptionType.subcommand,
                    ),
                ],
            )
        ]

        for command in commands:
            for option in command.options:
                self.bot.reserved_commands.append(f"{command.name} {option.name}")

        current_commands = await self.bot.fetch_global_application_commands()

        if current_commands != commands:
            # Figure out which commands are new and which are removed
            print("[Command Publisher] Change detected. Updating...")
            for command in current_commands:
                await self.bot.delete_global_application_command(command)

            await self.bot.bulk_create_global_application_commands(commands)
            print("[Command Publisher] Updated! Will take up to an hour to take effect.")


def setup(client):
    client.add_cog(CommandPublisher(client))
