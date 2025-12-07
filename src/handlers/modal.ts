import type { APIModalSubmitInteraction } from "discord-api-types/v10";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { upsertCommand } from "../db/commands";
import { ensureGuild, guildCommandCount } from "../db/guilds";
import { registerGuildCommand } from "../discord/registration";
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

export const handleModal = async ({ interaction, context }: HandleModalInput) => {
	const guildId = interaction.guild_id;
	if (!guildId)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Use this in a server.", flags: MessageFlags.Ephemeral },
			},
		});
	if (!hasManageGuild(interaction.member?.permissions))
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Manage Server required.", flags: MessageFlags.Ephemeral },
			},
		});

	const fields = collectFields(interaction);

	const name = sanitizeName(fields.name ?? "");
	if (!name)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Invalid name.", flags: MessageFlags.Ephemeral },
			},
		});

	const reply = (fields.reply ?? "").trim().slice(0, 2000);
	if (!reply.length)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Reply is required.", flags: MessageFlags.Ephemeral },
			},
		});

	const rawDescription = (fields.description ?? "").trim();
	const description = (rawDescription || "A command made by Slashy.").slice(0, 100);

	const visibilityParsed = parseVisibility(fields.visibility_select ?? fields.visibility ?? fields.ephemeral);
	if (visibilityParsed === undefined)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Invalid visibility. Use public or ephemeral.", flags: MessageFlags.Ephemeral },
			},
		});

	const ephemeral = visibilityParsed;

	const [guild, count] = await Promise.all([
		ensureGuild({ guildId, env: context.env }),
		guildCommandCount({ guildId, env: context.env }),
	]);
	if (guild.banned)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "This server is banned.", flags: MessageFlags.Ephemeral },
			},
		});

	if (count >= guild.maxCommands)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Limit reached (${guild.maxCommands}). Delete some first.`,
					flags: MessageFlags.Ephemeral,
				},
			},
		});

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
					content: `Saved but failed to register with Discord: ${registration.error}`,
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
			data: { content: `/${name} added.`, flags: MessageFlags.Ephemeral },
		},
	});
};
