import type {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIChatInputApplicationCommandInteractionData,
} from "discord-api-types/v10";
import { ApplicationCommandOptionType, ApplicationCommandType, InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { getCommand, listCommands, removeCommand } from "../db/commands";
import { deleteGuildCommand } from "../discord/registration";
import { resolveLocale, t } from "../i18n";
import type { HandlerContext } from "../types";
import { hasManageGuild, sanitizeName } from "../utils/interaction";
import { captureEvent } from "../utils/posthog";
import { deferredResponse, editInteractionResponse, jsonResponse } from "../utils/responses";

type DeleteInput = {
	guildId: string;
	name: string;
	context: HandlerContext;
	locale: string;
	token: string;
	ctx: ExecutionContext;
};

type ListInput = {
	guildId: string;
	context: HandlerContext;
	locale: string;
	token: string;
	ctx: ExecutionContext;
};

type SubcommandOptions = APIChatInputApplicationCommandInteractionData["options"] | APIApplicationCommandAutocompleteInteraction["data"]["options"];

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
	allowedRoles: string[];
};

const modalResponse = (locale: string, command?: ModalCommandState) =>
	jsonResponse({
		data: {
			type: InteractionResponseType.Modal,
			data: {
				custom_id: command ? `slashy:edit:${command.name}` : "slashy:add",
				title: command ? t(locale, "modalTitleEdit") : t(locale, "modalTitleAdd"),
				components: [
					{
						type: 1,
						components: [
							{
								type: 4,
								custom_id: "name",
								label: t(locale, "modalNameLabel"),
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
								label: t(locale, "modalReplyLabel"),
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
								label: t(locale, "modalDescriptionLabel"),
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
						label: t(locale, "modalVisibilityLabel"),
						component: {
							type: 3,
							custom_id: "visibility_select",
							placeholder: t(locale, "modalVisibilityPlaceholder"),
							min_values: 1,
							max_values: 1,
							required: true,
							options: [
								{
									label: t(locale, "modalVisibilityPublicLabel"),
									value: "public",
									description: t(locale, "modalVisibilityPublicDescription"),
									default: !command?.ephemeral,
								},
								{
									label: t(locale, "modalVisibilityEphemeralLabel"),
									value: "ephemeral",
									description: t(locale, "modalVisibilityEphemeralDescription"),
									default: !!command?.ephemeral,
								},
							],
						},
					},
					{
						type: 18,
						label: t(locale, "modalRoleSelectLabel"),
						description: t(locale, "modalRoleSelectDescription"),
						component: {
							type: 6,
							custom_id: "role_select",
							min_values: 0,
							max_values: 25,
							required: false,
							...(command?.allowedRoles?.length
								? {
										default_values: command.allowedRoles.map((roleId) => ({
											id: roleId,
											type: "role" as const,
										})),
									}
								: {}),
						},
					},
				],
			},
		},
	});

const handleList = async ({ guildId, context, locale, token, ctx }: ListInput) => {
	ctx.waitUntil(
		(async () => {
			const commands = await listCommands({ guildId, env: context.env });
			const usesLabel = t(locale, "usesLabel");
			const ephemeralLabel = t(locale, "ephemeralLabel");
			const lines = commands.map(
				(row) => `/${row.name} — ${row.description} (${row.uses} ${usesLabel}${row.ephemeral ? `, ${ephemeralLabel}` : ""})`,
			);
			const content = lines.join("\n").slice(0, 1900) || t(locale, "listEmpty");

			await Promise.all([
				captureEvent({
					env: context.env,
					options: {
						distinctId: guildId,
						event: "command_list",
						properties: { count: commands.length },
					},
				}),
				editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token,
					content,
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				}),
			]);
		})().catch((error) => console.error("handleList async error", error)),
	);

	return deferredResponse(true);
};

const handleDelete = async ({ guildId, name, context, locale, token, ctx }: DeleteInput) => {
	ctx.waitUntil(
		(async () => {
			const [deletedCommand] = await Promise.all([
				removeCommand({ guildId, name, env: context.env }),
				deleteGuildCommand({ rest: context.rest, appId: context.env.DISCORD_APP_ID, guildId, name }),
			]);

			if (!deletedCommand) {
				await editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token,
					content: t(locale, "commandNotFound"),
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				});
				return;
			}

			await Promise.all([
				captureEvent({
					env: context.env,
					options: { distinctId: guildId, event: "command_deleted", properties: { name } },
				}),
				editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token,
					content: t(locale, "removedCommand", { name }),
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				}),
			]);
		})().catch((error) => console.error("handleDelete async error", error)),
	);

	return deferredResponse(true);
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
	ctx: ExecutionContext;
};

export const handleSlashy = async ({ interaction, context, ctx }: HandleSlashyInput) => {
	const guildId = interaction.guild_id;
	const locale = resolveLocale(interaction);
	if (!guildId)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "useInServer"), flags: MessageFlags.Ephemeral },
			},
		});

	if (interaction.data.type !== ApplicationCommandType.ChatInput)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "chatInputOnly"), flags: MessageFlags.Ephemeral },
			},
		});

	if (!hasManageGuild(interaction.member?.permissions))
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "manageServerRequired"), flags: MessageFlags.Ephemeral },
			},
		});

	const data = interaction.data as APIChatInputApplicationCommandInteractionData;
	const option = getSubcommand(data.options);

	if (!option || option.type !== ApplicationCommandOptionType.Subcommand) return modalResponse(locale);

	if (option.name === "add") return modalResponse(locale);

	if (option.name === "edit") {
		const nameOption = option.options?.find((candidate) => candidate.name === "name");
		const name = sanitizeName(typeof nameOption?.value === "string" ? nameOption.value : "");
		if (!name)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: t(locale, "provideValidName"), flags: MessageFlags.Ephemeral },
				},
			});

		const command = await getCommand({ guildId, name, env: context.env });
		if (!command)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: t(locale, "commandNotFound"), flags: MessageFlags.Ephemeral },
				},
			});

		return modalResponse(locale, {
			name,
			reply: command.reply,
			description: command.description,
			ephemeral: command.ephemeral,
			allowedRoles: command.allowedRoles,
		});
	}

	if (option.name === "list") return handleList({ guildId, context, locale, token: interaction.token, ctx });

	if (option.name === "delete") {
		const nameOption = option.options?.find((candidate) => candidate.name === "name");
		const name = sanitizeName(typeof nameOption?.value === "string" ? nameOption.value : "");
		if (!name)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: t(locale, "provideValidName"), flags: MessageFlags.Ephemeral },
				},
			});
		return handleDelete({ guildId, name, context, locale, token: interaction.token, ctx });
	}

	return modalResponse(locale);
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
