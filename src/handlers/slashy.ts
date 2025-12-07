import type {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIChatInputApplicationCommandInteractionData,
} from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { getCommand, listCommands, removeCommand } from "../db/commands";
import { deleteGuildCommand } from "../discord/registration";
import type { HandlerContext } from "../types";
import { hasManageGuild, sanitizeName } from "../utils/interaction";
import { captureEvent } from "../utils/posthog";
import { jsonResponse } from "../utils/responses";

type DeleteInput = {
	guildId: string;
	name: string;
	context: HandlerContext;
};

type SubcommandOptions =
	| APIChatInputApplicationCommandInteractionData["options"]
	| APIApplicationCommandAutocompleteInteraction["data"]["options"];

type AutocompleteOption = APIApplicationCommandInteractionDataOption<4> & {
	options?: AutocompleteOption[];
	focused?: boolean;
	value?: unknown;
};

const autocompleteResponse = (choices: { name: string; value: string }[]) =>
	jsonResponse({
		data: {
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: { choices },
		},
	});

type ModalCommandState = {
	name: string;
	reply: string;
	description: string;
	ephemeral: boolean;
};

const modalResponse = (command?: ModalCommandState) =>
	jsonResponse({
		data: {
			type: InteractionResponseType.Modal,
			data: {
				custom_id: command ? `slashy:edit:${command.name}` : "slashy:add",
				title: command ? "Edit command" : "Add command",
				components: [
					{
						type: 1,
						components: [
							{
								type: 4,
								custom_id: "name",
								label: "Command name",
								style: 1,
								min_length: 1,
								max_length: 32,
								required: true,
								value: command?.name,
							},
						],
					},
					{
						type: 1,
						components: [
							{
								type: 4,
								custom_id: "reply",
								label: "Reply",
								style: 2,
								min_length: 1,
								max_length: 2000,
								required: true,
								value: command?.reply,
							},
						],
					},
					{
						type: 1,
						components: [
							{
								type: 4,
								custom_id: "description",
								label: "Description",
								style: 1,
								min_length: 1,
								max_length: 100,
								required: false,
								value: command?.description,
							},
						],
					},
					{
						type: 18,
						label: "Visibility",
						component: {
							type: 3,
							custom_id: "visibility_select",
							placeholder: "Reply visibility",
							min_values: 1,
							max_values: 1,
							required: true,
							options: [
								{
									label: "Public",
									value: "public",
									description: "Visible to everyone",
									default: !command?.ephemeral,
								},
								{
									label: "Ephemeral",
									value: "ephemeral",
									description: "Visible only to you",
									default: !!command?.ephemeral,
								},
							],
						},
					},
				],
			},
		},
	});

export type HandleListInput = {
	guildId: string;
	context: HandlerContext;
};

const handleList = async ({ guildId, context }: HandleListInput) => {
	const commands = await listCommands({ guildId, env: context.env });
	const lines = commands.map(
		(row) => `/${row.name} — ${row.description} (${row.uses} uses${row.ephemeral ? ", ephemeral" : ""})`,
	);
	const content = lines.join("\n").slice(0, 1900) || "No custom commands yet.";

	await captureEvent({
		env: context.env,
		options: {
			distinctId: guildId,
			event: "command_list",
			properties: { count: commands.length },
		},
	});

	return jsonResponse({
		data: {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content, flags: MessageFlags.Ephemeral },
		},
	});
};

const handleDelete = async ({ guildId, name, context }: DeleteInput) => {
	await Promise.all([
		removeCommand({ guildId, name, env: context.env }),
		deleteGuildCommand({ rest: context.rest, appId: context.env.DISCORD_APP_ID, guildId, name }),
	]);
	await captureEvent({
		env: context.env,
		options: { distinctId: guildId, event: "command_deleted", properties: { name } },
	});

	return jsonResponse({
		data: {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: `Removed /${name}`, flags: MessageFlags.Ephemeral },
		},
	});
};

const getSubcommand = (options: SubcommandOptions) =>
	options?.find((option) => option.type === ApplicationCommandOptionType.Subcommand) as
		| APIApplicationCommandInteractionDataSubcommandOption
		| undefined;

const findFocusedValue = (options: AutocompleteOption[] | undefined): string => {
	if (!options) return "";
	for (const option of options) {
		if (option.focused && typeof option.value === "string") return option.value;
		const nested = findFocusedValue(option.options as AutocompleteOption[] | undefined);
		if (nested) return nested;
	}
	return "";
};

export type HandleSlashyInput = {
	interaction: APIApplicationCommandInteraction;
	context: HandlerContext;
};

export const handleSlashy = async ({ interaction, context }: HandleSlashyInput) => {
	const guildId = interaction.guild_id;
	if (!guildId)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Use this in a server.", flags: MessageFlags.Ephemeral },
			},
		});

	if (interaction.data.type !== ApplicationCommandType.ChatInput)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Use chat input commands.", flags: MessageFlags.Ephemeral },
			},
		});

	if (!hasManageGuild(interaction.member?.permissions))
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Manage Server required.", flags: MessageFlags.Ephemeral },
			},
		});

	const data = interaction.data as APIChatInputApplicationCommandInteractionData;
	const option = getSubcommand(data.options);

	if (!option || option.type !== ApplicationCommandOptionType.Subcommand) return modalResponse();

	if (option.name === "add") return modalResponse();

	if (option.name === "edit") {
		const nameOption = option.options?.find((candidate) => candidate.name === "name");
		const name = sanitizeName(typeof nameOption?.value === "string" ? nameOption.value : "");
		if (!name)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: "Provide a valid name.", flags: MessageFlags.Ephemeral },
				},
			});

		const command = await getCommand({ guildId, name, env: context.env });
		if (!command)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: "Command not found.", flags: MessageFlags.Ephemeral },
				},
			});

		return modalResponse({
			name,
			reply: command.reply,
			description: command.description,
			ephemeral: command.ephemeral,
		});
	}

	if (option.name === "list") return handleList({ guildId, context });

	if (option.name === "delete") {
		const nameOption = option.options?.find((candidate) => candidate.name === "name");
		const name = sanitizeName(typeof nameOption?.value === "string" ? nameOption.value : "");
		if (!name)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: "Provide a valid name.", flags: MessageFlags.Ephemeral },
				},
			});
		return handleDelete({ guildId, name, context });
	}
	return modalResponse();
};

export type HandleSlashyAutocompleteInput = {
	interaction: APIApplicationCommandAutocompleteInteraction;
	context: HandlerContext;
};

export const handleSlashyAutocomplete = async ({ interaction, context }: HandleSlashyAutocompleteInput) => {
	const guildId = interaction.guild_id;
	if (!guildId) return autocompleteResponse([]);

	const subcommand = getSubcommand(interaction.data.options);
	if (!subcommand || !["delete", "edit"].includes(subcommand.name)) return autocompleteResponse([]);

	const focusedValue = findFocusedValue(subcommand.options as AutocompleteOption[] | undefined);
	const query = sanitizeName(focusedValue);
	const commands = await listCommands({ guildId, env: context.env });

	const choices = commands
		.filter(({ name }) => (!query ? true : name.includes(query)))
		.slice(0, 25)
		.map(({ name, description }) => {
			const label = description ? `${name} — ${description}` : name;
			return { name: label.slice(0, 100), value: name };
		});
	return autocompleteResponse(choices);
};
