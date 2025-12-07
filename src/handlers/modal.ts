import type { APIModalSubmitInteraction } from "discord-api-types/v10";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { getCommand, updateCommand, upsertCommand } from "../db/commands";
import { ensureGuild, guildCommandCount } from "../db/guilds";
import { deleteGuildCommand, registerGuildCommand } from "../discord/registration";
import { resolveLocale, t } from "../i18n";
import type { HandlerContext } from "../types";
import { collectFields, hasManageGuild, parseVisibility, sanitizeName } from "../utils/interaction";
import { captureEvent } from "../utils/posthog";
import { jsonResponse } from "../utils/responses";

type RegisterResult = {
	success: boolean;
	error?: string;
};

export type RegisterWithDiscordInput = {
	name: string;
	description: string;
	guildId: string;
	context: HandlerContext;
};

const registerWithDiscord = async ({
	name,
	description,
	guildId,
	context,
}: RegisterWithDiscordInput): Promise<RegisterResult> => {
	try {
		await registerGuildCommand({
			rest: context.rest,
			appId: context.env.DISCORD_APP_ID,
			guildId,
			name,
			description,
		});
		return { success: true };
	} catch (error) {
		return { success: false, error: String(error) };
	}
};

export type HandleModalInput = {
	interaction: APIModalSubmitInteraction;
	context: HandlerContext;
};

const parseCustomId = (customId: string) => {
	if (customId === "slashy:add") return { mode: "add" as const };
	if (customId.startsWith("slashy:edit:"))
		return { mode: "edit" as const, originalName: sanitizeName(customId.slice("slashy:edit:".length)) };
	return { mode: "unknown" as const };
};

export const handleModal = async ({ interaction, context }: HandleModalInput) => {
	const guildId = interaction.guild_id;
	const locale = resolveLocale(interaction);
	if (!guildId)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "useInServer"), flags: MessageFlags.Ephemeral },
			},
		});
	if (!hasManageGuild(interaction.member?.permissions))
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "manageServerRequired"), flags: MessageFlags.Ephemeral },
			},
		});

	const { mode, originalName } = parseCustomId(interaction.data.custom_id ?? "");
	if (mode === "unknown")
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "unsupportedModal"), flags: MessageFlags.Ephemeral },
			},
		});

	const isEdit = mode === "edit";
	const fields = collectFields(interaction);

	const name = sanitizeName(fields.name ?? "");
	if (!name)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "invalidName"), flags: MessageFlags.Ephemeral },
			},
		});

	const reply = (fields.reply ?? "").trim().slice(0, 2000);
	if (!reply.length)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "replyRequired"), flags: MessageFlags.Ephemeral },
			},
		});

	const rawDescription = (fields.description ?? "").trim();
	const description = (rawDescription || t(locale, "defaultDescription")).slice(0, 100);

	const visibilityParsed = parseVisibility(fields.visibility_select ?? fields.visibility ?? fields.ephemeral);
	if (visibilityParsed === undefined)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "invalidVisibility"), flags: MessageFlags.Ephemeral },
			},
		});

	const ephemeral = visibilityParsed;

	const existing =
		isEdit && originalName ? await getCommand({ guildId, name: originalName, env: context.env }) : undefined;

	if (isEdit && (!originalName || !existing))
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "commandNotFound"), flags: MessageFlags.Ephemeral },
			},
		});

	const existingName = originalName ?? name;

	if (isEdit && name !== existingName) {
		const conflict = await getCommand({ guildId, name, env: context.env });
		if (conflict)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: t(locale, "nameInUse"), flags: MessageFlags.Ephemeral },
				},
			});
	}

	const [guild, count] = await Promise.all([
		ensureGuild({ guildId, env: context.env }),
		guildCommandCount({ guildId, env: context.env }),
	]);
	if (guild.banned)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "guildBanned"), flags: MessageFlags.Ephemeral },
			},
		});

	if (!isEdit && count >= guild.maxCommands)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: t(locale, "limitReached", { limit: guild.maxCommands }),
					flags: MessageFlags.Ephemeral,
				},
			},
		});

	if (!isEdit) {
		const id = crypto.randomUUID();
		const [registration] = await Promise.all([
			registerWithDiscord({ name, description, guildId, context }),
			upsertCommand({ id, guildId, name, reply, description, ephemeral, env: context.env }),
		]);
		if (!registration.success)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: t(locale, "savedButFailedDiscord", { error: registration.error ?? "unknown" }),
						flags: MessageFlags.Ephemeral,
					},
				},
			});

		await captureEvent({
			env: context.env,
			options: {
				distinctId: guildId,
				event: "command_created",
				properties: {
					name,
					ephemeral,
					descriptionLength: description.length,
				},
			},
		});

		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "addedCommand", { name }), flags: MessageFlags.Ephemeral },
			},
		});
	}

	const rename = existingName !== name;

	if (!rename) {
		const [registration] = await Promise.all([
			registerWithDiscord({ name, description, guildId, context }),
			updateCommand({
				guildId,
				originalName: existingName,
				name,
				reply,
				description,
				ephemeral,
				env: context.env,
			}),
		]);
		if (!registration.success)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: t(locale, "savedButFailedDiscord", { error: registration.error ?? "unknown" }),
						flags: MessageFlags.Ephemeral,
					},
				},
			});
	} else {
		const registration = await registerWithDiscord({ name, description, guildId, context });
		if (!registration.success)
			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: t(locale, "failedRegisterNewName", { error: registration.error ?? "unknown" }),
						flags: MessageFlags.Ephemeral,
					},
				},
			});

		await updateCommand({
			guildId,
			originalName: existingName,
			name,
			reply,
			description,
			ephemeral,
			env: context.env,
		});
		await deleteGuildCommand({
			rest: context.rest,
			appId: context.env.DISCORD_APP_ID,
			guildId,
			name: existingName,
		}).catch((error) => console.error("deleteGuildCommand", error));
	}

	await captureEvent({
		env: context.env,
		options: {
			distinctId: guildId,
			event: "command_updated",
			properties: {
				name,
				previousName: existingName,
				renamed: rename,
				ephemeral,
				descriptionLength: description.length,
			},
		},
	});

	const content = rename
		? t(locale, "updatedCommandRenamed", { name, previousName: existingName })
		: t(locale, "updatedCommand", { name });

	return jsonResponse({
		data: {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content, flags: MessageFlags.Ephemeral },
		},
	});
};
