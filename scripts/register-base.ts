import { REST } from "@discordjs/rest";
import { ApplicationCommandOptionType, Routes } from "discord-api-types/v10";

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.GUILD_ID;

if (!token || !appId) {
	console.error("DISCORD_TOKEN and DISCORD_APP_ID are required");
	process.exit(1);
}

const commands = [
	{
		name: "slashy",
		description: "Manage custom slash commands",
		default_member_permissions: "32",
		dm_permission: false,
		options: [
			{ type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Create a custom command" },
			{ type: ApplicationCommandOptionType.Subcommand, name: "list", description: "List custom commands" },
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "delete",
				description: "Delete a custom command",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "name",
						description: "Command name",
						required: true,
						autocomplete: true,
					},
				],
			},
		],
	},
];

const rest = new REST({ version: "10" }).setToken(token);

const route = guildId ? Routes.applicationGuildCommands(appId, guildId) : Routes.applicationCommands(appId);

rest.put(route, { body: commands })
	.then(() => console.log("registered"))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
