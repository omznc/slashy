import type { APIModalSubmitInteraction } from "discord-api-types/v10";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { getCommand, updateCommand, upsertCommand } from "../db/commands";
import { ensureGuild, guildCommandCount } from "../db/guilds";
import { deleteGuildCommand, registerGuildCommand } from "../discord/registration";
import { resolveLocale, t } from "../i18n";
import type { HandlerContext } from "../types";
import { collectFields, hasManageGuild, parseVisibility, sanitizeName } from "../utils/interaction";
import { captureEvent } from "../utils/posthog";
import { deferredResponse, editInteractionResponse, jsonResponse } from "../utils/responses";

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

const registerWithDiscord = async ({ name, description, guildId, context }: RegisterWithDiscordInput): Promise<RegisterResult> => {
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
	ctx: ExecutionContext;
};

const parseCustomId = (customId: string) => {
	if (customId === "slashy:add") return { mode: "add" as const };
	if (customId.startsWith("slashy:edit:")) return { mode: "edit" as const, originalName: sanitizeName(customId.slice("slashy:edit:".length)) };
	return { mode: "unknown" as const };
};

const parseRoleIds = (value: string | undefined) =>
	Array.from(
		new Set(
			(value ?? "")
				.split(",")
				.map((entry) => entry.trim())
				.filter(Boolean),
		),
	).slice(0, 25);

export const handleModal = async ({ interaction, context, ctx }: HandleModalInput) => {
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
	const user = interaction.member?.user ?? interaction.user;
	const displayName = interaction.member?.nick || user?.global_name || user?.username || "";
	const description = (rawDescription || t(locale, "defaultDescription", { user: displayName || "someone" })).slice(0, 100);

	const visibilityParsed = parseVisibility(fields.visibility_select ?? fields.visibility ?? fields.ephemeral);
	if (visibilityParsed === undefined)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "invalidVisibility"), flags: MessageFlags.Ephemeral },
			},
		});

	const ephemeral = visibilityParsed;
	const allowedRoles = parseRoleIds(fields.role_select);

	const existing = isEdit && originalName ? await getCommand({ guildId, name: originalName, env: context.env }) : undefined;

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

	const guild = await ensureGuild({ guildId, env: context.env });
	if (guild.banned)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "guildBanned"), flags: MessageFlags.Ephemeral },
			},
		});

	const count = await guildCommandCount({ guildId, env: context.env });
	if (guild.created)
		ctx.waitUntil(
			captureEvent({
				env: context.env,
				options: {
					distinctId: guildId,
					event: "guild_joined",
					properties: {
						maxCommands: guild.maxCommands,
						commandCount: count,
					},
				},
			}),
		);

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
		ctx.waitUntil(
			(async () => {
				const id = crypto.randomUUID();
				const [registration] = await Promise.all([
					registerWithDiscord({ name, description, guildId, context }),
					upsertCommand({
						id,
						guildId,
						name,
						reply,
						description,
						ephemeral,
						allowedRoles,
						env: context.env,
					}),
				]);

				const content = registration.success
					? t(locale, "addedCommand", { name })
					: t(locale, "savedButFailedDiscord", { error: registration.error ?? "unknown" });

				await Promise.all([
					captureEvent({
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
					}),
					editInteractionResponse({
						appId: context.env.DISCORD_APP_ID,
						token: interaction.token,
						content,
						flags: MessageFlags.Ephemeral,
						rest: context.rest,
					}),
				]);
			})().catch((error) => console.error("handleModal add async error", error)),
		);

		return deferredResponse(true);
	}

	const rename = existingName !== name;

	ctx.waitUntil(
		(async () => {
			let finalContent: string;

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
						allowedRoles,
						env: context.env,
					}),
				]);
				finalContent = registration.success
					? t(locale, "updatedCommand", { name })
					: t(locale, "savedButFailedDiscord", { error: registration.error ?? "unknown" });
			} else {
				const registration = await registerWithDiscord({ name, description, guildId, context });
				if (!registration.success) {
					await editInteractionResponse({
						appId: context.env.DISCORD_APP_ID,
						token: interaction.token,
						content: t(locale, "failedRegisterNewName", { error: registration.error ?? "unknown" }),
						flags: MessageFlags.Ephemeral,
						rest: context.rest,
					});
					return;
				}

				await updateCommand({
					guildId,
					originalName: existingName,
					name,
					reply,
					description,
					ephemeral,
					allowedRoles,
					env: context.env,
				});
				await deleteGuildCommand({
					rest: context.rest,
					appId: context.env.DISCORD_APP_ID,
					guildId,
					name: existingName,
				}).catch((error) => console.error("deleteGuildCommand", error));

				finalContent = t(locale, "updatedCommandRenamed", { name, previousName: existingName });
			}

			await Promise.all([
				captureEvent({
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
				}),
				editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token: interaction.token,
					content: finalContent,
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				}),
			]);
		})().catch((error) => console.error("handleModal edit async error", error)),
	);

	return deferredResponse(true);
};
