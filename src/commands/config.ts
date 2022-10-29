import { CommandInteraction, EmbedBuilder } from "discord.js";
import { GetGuildBanned, GetGuildCommandLimitInfo, GetGuildPermission, SetGuildPermission } from "../database/methods";
import { messages } from "../text/messages";
import { logger } from "../utils/logger";
import { ConfigTypes } from "../utils/configTypes";

const _config = require('../utils/config').getConfigs([ ConfigTypes.LOGO, ConfigTypes.COLOR ]);

// Handler for /slashy config [role:role]
export const config = async (
	interaction: CommandInteraction,
	options: Map<string, any>
): Promise<void> => {
	if (interaction.member!.user.id != interaction.guild!.ownerId) {
		await interaction.editReply(messages.CommandOwnerOnlyError);
		return;
	}
	await GetGuildBanned(interaction.guildId!)
		.then(isBanned => {
			if (isBanned) return Promise.reject(messages.CommandGuildBannedError);
		})
		.then(async () => {
			const role: string | undefined = options.get("role");
			const oldRole = await GetGuildPermission(interaction.guildId!);

			switch (role) {
				case undefined:
					const [ maxCommands, currentCommands ] = await GetGuildCommandLimitInfo(interaction.guildId!);
					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle(`${ interaction.guild!.name }'s Configuration`)
								.setThumbnail(_config.LOGO)
								.setColor(_config.COLOR)
								.addFields([
									{
										name: "Permissions",
										value: oldRole ===
										'OWNER' ? messages.CommandConfigPermissionIsOwner : messages.CommandConfigPermissionIsRole.replace("{oldRole}", oldRole),
									},
									{
										name: "Command Limits",
										value: messages.CommandConfigCommandLimits.replace("{maxCommands}", maxCommands.toString()).replace("{currentCommands}", currentCommands.toString()),
									}
								])
						]
					})
					break;
				case oldRole:
					await interaction.editReply(messages.CommandConfigSamePermissionError);
					break;
				default:
					await SetGuildPermission(interaction.guildId!, role)
						.then(async () => {
							await interaction.editReply(messages.CommandConfigSuccess.replace("{role}", `<@&${ role }>`));
						})
					break;
			}
		})
		.catch(async (error) => {
			await interaction.editReply(error ?? messages.UnspecifiedError);
			logger.error(error);
		});
};
