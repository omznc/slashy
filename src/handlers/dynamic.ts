import type {
	APIApplicationCommandInteraction,
	APIChatInputApplicationCommandInteractionData,
} from "discord-api-types/v10";
import { ApplicationCommandType, InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { getCommand, incrementCommandUses } from "../db/commands";
import { resolveLocale, t } from "../i18n";
import type { HandlerContext } from "../types";
import { formatReply } from "../utils/interaction";
import { captureEvent } from "../utils/posthog";
import { jsonResponse } from "../utils/responses";

export type HandleDynamicInput = {
	interaction: APIApplicationCommandInteraction;
	context: HandlerContext;
};

export const handleDynamic = async ({ interaction, context }: HandleDynamicInput) => {
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

	const command = await getCommand({ guildId, name: data.name, env: context.env });
	if (!command)
		return jsonResponse({
			data: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: t(locale, "unknownCommand"), flags: MessageFlags.Ephemeral },
			},
		});

	const content = formatReply({ template: command.reply, interaction }).slice(0, 2000);
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
	]);

	return jsonResponse({
		data: {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content, flags: command.ephemeral ? MessageFlags.Ephemeral : 0 },
		},
	});
};
