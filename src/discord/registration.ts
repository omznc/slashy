import type { REST } from "@discordjs/rest";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ApplicationCommandOptionType, type RESTGetAPIApplicationGuildCommandsResult, Routes } from "discord-api-types/v10";
import { localizations, t } from "../i18n";

export const baseCommand: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "slashy",
	description: t("en", "slashyDescription"),
	description_localizations: localizations("slashyDescription"),
	default_member_permissions: "32",
	dm_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "add",
			description: t("en", "slashyAddDescription"),
			description_localizations: localizations("slashyAddDescription"),
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "edit",
			description: t("en", "slashyEditDescription"),
			description_localizations: localizations("slashyEditDescription"),
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "name",
					description: t("en", "slashyNameDescription"),
					description_localizations: localizations("slashyNameDescription"),
					required: true,
					autocomplete: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "list",
			description: t("en", "slashyListDescription"),
			description_localizations: localizations("slashyListDescription"),
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "delete",
			description: t("en", "slashyDeleteDescription"),
			description_localizations: localizations("slashyDeleteDescription"),
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "name",
					description: t("en", "slashyDeleteNameDescription"),
					description_localizations: localizations("slashyDeleteNameDescription"),
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

	const commands = (await rest.get(Routes.applicationGuildCommands(appId, guildId))) as RESTGetAPIApplicationGuildCommandsResult;

	const existing = commands.find((command) => command.name === name);
	const defaultUser = "Slashy";
	const desc = (description || t("en", "defaultDescription", { user: defaultUser })).slice(0, 100);
	const isDefaultDescription = !description;
	const localizedDefaultDescription = Object.fromEntries(
		Object.entries(localizations("defaultDescription")).map(([locale, value]) => [locale, value.replaceAll("{user}", defaultUser)]),
	);

	const payload: RESTPostAPIChatInputApplicationCommandsJSONBody = isDefaultDescription
		? {
				name,
				description: desc,
				description_localizations: localizedDefaultDescription,
				type: 1,
			}
		: {
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

	const commands = (await rest.get(Routes.applicationGuildCommands(appId, guildId))) as RESTGetAPIApplicationGuildCommandsResult;

	const target = commands.find((command) => command.name === name);
	if (!target) return;

	await rest.delete(Routes.applicationGuildCommand(appId, guildId, target.id));
};
