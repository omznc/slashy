import type { REST } from "@discordjs/rest";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	type RESTGetAPIApplicationGuildCommandsResult,
	Routes,
} from "discord-api-types/v10";

export const baseCommand: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "slashy",
	description: "Manage custom slash commands",
	default_member_permissions: "32",
	dm_permission: false,
	options: [
		{ type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Create a custom command" },
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "edit",
			description: "Edit a custom command",
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

export type BaseCommandInput = {
	rest: REST;
	appId: string;
};

export const ensureBaseCommand = async ({ rest, appId }: BaseCommandInput) => {
	await rest.put(Routes.applicationCommands(appId), { body: [baseCommand] });
};

export type GuildCommandRegistrationInput = {
	rest: REST;
	appId: string;
	guildId: string;
	name: string;
	description: string;
};

export const registerGuildCommand = async (input: GuildCommandRegistrationInput) => {
	const { rest, appId, guildId, name, description } = input;

	const commands = (await rest.get(
		Routes.applicationGuildCommands(appId, guildId),
	)) as RESTGetAPIApplicationGuildCommandsResult;

	const existing = commands.find((command) => command.name === name);
	const desc = (description || "A command made by Slashy.").slice(0, 100);

	const payload: RESTPostAPIChatInputApplicationCommandsJSONBody = {
		name,
		description: desc,
		type: 1,
	};

	if (existing) {
		await rest.patch(Routes.applicationGuildCommand(appId, guildId, existing.id), { body: payload });
		return;
	}

	await rest.post(Routes.applicationGuildCommands(appId, guildId), { body: payload });
};

export type DeleteGuildCommandInput = {
	rest: REST;
	appId: string;
	guildId: string;
	name: string;
};

export const deleteGuildCommand = async (input: DeleteGuildCommandInput) => {
	const { rest, appId, guildId, name } = input;

	const commands = (await rest.get(
		Routes.applicationGuildCommands(appId, guildId),
	)) as RESTGetAPIApplicationGuildCommandsResult;

	const target = commands.find((command) => command.name === name);
	if (!target) return;

	await rest.delete(Routes.applicationGuildCommand(appId, guildId, target.id));
};
