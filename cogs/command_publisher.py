from json import loads, dump

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
    Cog for checking changes in the global command, and updating it if necessary.
    """

    def __init__(self, bot):
        self.bot, self.bot.reserved_commands = bot, []

    @Cog.listener()
    async def on_ready(self):
        localizations = loads(open("localizations.json", "r", encoding="utf-8").read())

        local_command = ApplicationCommand(
            name="slashy",
            description="The category for Slashy's commands.",
            type=ApplicationCommandType.chat_input,
            options=[
                ApplicationCommandOption(
                    name="add",
                    description="[ADMIN] Add a custom command.",
                    name_localizations=localizations["subcommands"]["add"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["add"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                    options=[
                        ApplicationCommandOption(
                            name="name",
                            description="What's the name of the command?",
                            name_localizations=localizations["options"]["name"]["name_localizations"],
                            description_localizations=localizations["options"]["name"]["description_localizations"],
                            type=ApplicationCommandOptionType.string,
                        ),
                        ApplicationCommandOption(
                            name="reply",
                            description="What will the command reply?",
                            name_localizations=localizations["options"]["reply"]["name_localizations"],
                            description_localizations=localizations["options"]["reply"]["description_localizations"],
                            type=ApplicationCommandOptionType.string,
                        ),
                        ApplicationCommandOption(
                            name="description",
                            description="What's the description of the command?",
                            name_localizations=localizations["options"]["description"]["name_localizations"],
                            description_localizations=localizations["options"]["description"][
                                "description_localizations"],
                            type=ApplicationCommandOptionType.string,
                            required=False,
                        ),
                    ],
                ),
                ApplicationCommandOption(
                    name="edit",
                    description="[ADMIN] Edit an existing custom command.",
                    name_localizations=localizations["subcommands"]["edit"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["edit"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                    options=[
                        ApplicationCommandOption(
                            name="name",
                            description="What's the name of the command you want to edit?",
                            name_localizations=localizations["options"]["name"]["name_localizations"],
                            description_localizations=localizations["options"]["name"]["description_localizations"],
                            type=ApplicationCommandOptionType.string,
                            autocomplete=True,
                        ),
                        ApplicationCommandOption(
                            name="reply",
                            description="What will the command reply now?",
                            name_localizations=localizations["options"]["reply"]["name_localizations"],
                            description_localizations=localizations["options"]["reply"]["description_localizations"],
                            type=ApplicationCommandOptionType.string,
                            required=False,
                        ),
                        ApplicationCommandOption(
                            name="description",
                            description="What's the description of the command now?",
                            name_localizations=localizations["options"]["description"]["name_localizations"],
                            description_localizations=localizations["options"]["description"][
                                "description_localizations"],
                            type=ApplicationCommandOptionType.string,
                            required=False,
                        ),
                    ],
                ),
                ApplicationCommandOption(
                    name="remove",
                    description="[ADMIN] Remove an existing custom command.",
                    name_localizations=localizations["subcommands"]["remove"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["remove"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                    options=[
                        ApplicationCommandOption(
                            name="name",
                            description="What's the name of the command you want to remove?",
                            name_localizations=localizations["options"]["name"]["name_localizations"],
                            description_localizations=localizations["options"]["name"]["description_localizations"],
                            type=ApplicationCommandOptionType.string,
                            autocomplete=True,
                        )
                    ],
                ),
                ApplicationCommandOption(
                    name="config",
                    description="[ADMIN] Bot configuration.",
                    name_localizations=localizations["subcommands"]["config"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["config"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                    options=[
                        ApplicationCommandOption(
                            name="permission",
                            description="What's the permission a user needs to use administrator commands?",
                            name_localizations=localizations["options"]["permission"]["name_localizations"],
                            description_localizations=localizations["options"]["permission"][
                                "description_localizations"],
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
                    name_localizations=localizations["subcommands"]["list"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["list"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                ),
                ApplicationCommandOption(
                    name="help",
                    description="Get help on how to use Slashy.",
                    name_localizations=localizations["subcommands"]["help"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["help"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                ),
                ApplicationCommandOption(
                    name="stats",
                    description="Some stats about Slashy.",
                    name_localizations=localizations["subcommands"]["stats"]["name_localizations"],
                    description_localizations=localizations["subcommands"]["stats"]["description_localizations"],
                    type=ApplicationCommandOptionType.subcommand,
                ),
            ],
        )

        self.bot.reserved_commands = [f"slashy {subcommand.name}" for subcommand in local_command.options]

        # Register commands if not already registered
        remote_commands: list[ApplicationCommand] = await self.bot.fetch_global_application_commands(with_localizations=True)

        if remote_commands is None or remote_commands[0] == local_command:
            return print("[Command Publisher] No changes found.")

        await self.bot.create_global_application_command(local_command)
        print("[Command Publisher] Found changes and updated commands.")


def setup(client):
    client.add_cog(CommandPublisher(client))
