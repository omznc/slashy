import { DiscordAPIError, REST } from "@discordjs/rest";
import { ApplicationCommandOptionType, Routes } from "discord-api-types/v10";

const token = process.env.DISCORD_TOKEN ?? "";
const appId = process.env.DISCORD_APP_ID ?? "";
const guildEnv = process.env.GUILD_ID;

if (!token || !appId) {
	console.error("DISCORD_TOKEN and DISCORD_APP_ID are required");
	process.exit(1);
}

const guildIds = guildEnv
	? guildEnv
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
	: [];

const baseCommand = {
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
};

const rest = new REST({ version: "10" }).setToken(token);

const mapGuildCommand = (cmd: { name: string; description?: string; type?: number }) => ({
	name: cmd.name,
	description: cmd.description || "A command made by Slashy.",
	type: 1,
});

async function resetGlobal() {
	await rest.put(Routes.applicationCommands(appId), { body: [baseCommand] });
}

async function resetGuild(guildId: string) {
	try {
		const existing = (await rest.get(Routes.applicationGuildCommands(appId, guildId))) as {
			id: string;
			name: string;
			description?: string;
			type?: number;
		}[];
		const recreated = existing.filter((cmd) => cmd.name !== "slashy" && cmd.type === 1).map(mapGuildCommand);
		await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: recreated });
		console.log(
			`guild ${guildId}: deleted ${existing.length} commands (${existing
				.map((c) => c.name)
				.join(", ")}) and recreated ${recreated.length}`,
		);
	} catch (error) {
		if (
			error instanceof DiscordAPIError &&
			(error.status === 403 || error.status === 404 || error.code === 50001)
		) {
			console.warn(`guild ${guildId}: missing access, skipped`);
			return;
		}
		console.error(`guild ${guildId}: failed`, error);
	}
}

async function main() {
	await resetGlobal();
	for (const gid of guildIds) {
		await resetGuild(gid);
	}
	console.log("slashy reset: global updated, guild commands refreshed");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
