import type {
	APIApplicationCommandInteraction,
	APIChatInputApplicationCommandInteractionData,
} from "discord-api-types/v10";
import { ApplicationCommandType, InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { getCommand, incrementCommandUses } from "../db/commands";
import type { HandlerContext } from "../types";
import { formatReply } from "../utils/interaction";
import { jsonResponse } from "../utils/responses";

export const handleDynamic = async (interaction: APIApplicationCommandInteraction, context: HandlerContext) => {
	const guildId = interaction.guild_id;
	if (!guildId)
		return jsonResponse({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Run this in a server.", flags: MessageFlags.Ephemeral },
		});
	if (interaction.data.type !== ApplicationCommandType.ChatInput)
		return jsonResponse({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Use chat input commands.", flags: MessageFlags.Ephemeral },
		});
	const data = interaction.data as APIChatInputApplicationCommandInteractionData;
	const command = await getCommand(guildId, data.name, context.env);
	if (!command)
		return jsonResponse({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Unknown command. Use /slashy add to create it.", flags: MessageFlags.Ephemeral },
		});
	await incrementCommandUses(command.id, context.env);
	const content = formatReply(command.reply, interaction).slice(0, 2000);
	return jsonResponse({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: { content, flags: command.ephemeral ? MessageFlags.Ephemeral : 0 },
	});
};
