import type { APIApplicationCommandInteraction, APIChatInputApplicationCommandInteractionData } from "discord-api-types/v10";
import { ApplicationCommandType, InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { getCommand, incrementCommandUses } from "../db/commands";
import { resolveLocale, t } from "../i18n";
import type { HandlerContext } from "../types";
import { formatReply } from "../utils/interaction";
import { captureEvent } from "../utils/posthog";
import { deferredResponse, editInteractionResponse, jsonResponse } from "../utils/responses";

export type HandleDynamicInput = {
	interaction: APIApplicationCommandInteraction;
	context: HandlerContext;
	ctx: ExecutionContext;
};

export const handleDynamic = async ({ interaction, context, ctx }: HandleDynamicInput) => {
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
	const data = interaction.data as APIChatInputApplicationCommandInteractionData;

	ctx.waitUntil(
		(async () => {
			const command = await getCommand({ guildId, name: data.name, env: context.env });
			if (!command) {
				await editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token: interaction.token,
					content: t(locale, "unknownCommand"),
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				});
				return;
			}

			const allowedRoles = command.allowedRoles ?? [];
			const memberRoles =
				Array.isArray((interaction.member as { roles?: string[] } | undefined)?.roles) && interaction.member ? interaction.member.roles : [];
			if (allowedRoles.length && !memberRoles.some((roleId) => allowedRoles.includes(roleId))) {
				await editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token: interaction.token,
					content: t(locale, "roleNotAllowed"),
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				});
				return;
			}

			let content: string;
			try {
				content = (await formatReply({ template: command.reply, interaction })).slice(0, 2000);
			} catch (error) {
				console.error("formatReply error", error);
				await editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token: interaction.token,
					content: t(locale, "templateError"),
					flags: MessageFlags.Ephemeral,
					rest: context.rest,
				});
				return;
			}
			await Promise.all([
				incrementCommandUses({ commandId: command.id, env: context.env }),
				captureEvent({
					env: context.env,
					options: {
						distinctId: guildId,
						event: "command_run",
						properties: {
							commandId: command.id,
							name: data.name,
							response: content,
							type: data.type,
							visibility: command.ephemeral ? "ephemeral" : "public",
							userId: interaction.member?.user.id ?? interaction.user?.id ?? "",
						},
					},
				}),
				editInteractionResponse({
					appId: context.env.DISCORD_APP_ID,
					token: interaction.token,
					content,
					flags: command.ephemeral ? MessageFlags.Ephemeral : 0,
					rest: context.rest,
				}),
			]);
		})().catch((error) => console.error("handleDynamic async error", error)),
	);

	return deferredResponse(true);
};
