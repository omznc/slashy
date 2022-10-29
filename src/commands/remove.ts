import { CommandInteraction } from "discord.js";
import { DoesCommandExist, GetGuildBanned, RemoveGuildCommand } from "../database/methods";
import { messages } from "../text/messages";
import { RemoveGuildCommandAPI } from "../utils/commands-api";
import { logger } from "../utils/logger";
import { ConfigTypes } from "../utils/configTypes";

const config = require('../utils/config').getConfigs([ ConfigTypes.EXTRA_LOGGING ]);

// Handler for /slashy remove <name:str>
export const remove = async (
	interaction: CommandInteraction,
	options: Map<string, any>
): Promise<void> => {
	await GetGuildBanned(interaction.guildId!)
		.then(isBanned => {
			if (isBanned) return Promise.reject(messages.CommandGuildBannedError);
		})
		.then(async () => {

			// Check if the command exists
			const name: string = options.get("name");
			if (!(await DoesCommandExist(interaction.guildId!, name))) return Promise.reject(messages.CommandDoesNotExist)

			// Remove the command
			else await RemoveGuildCommand(interaction.guildId!, name)
				.then(async (commandId) => {
					if (commandId === null) return Promise.reject(messages.UnspecifiedError);
					await RemoveGuildCommandAPI(interaction.guildId!, commandId)
						.then(async () => {
							await interaction.editReply(messages.CommandRemoved);
							if (config.EXTRA_LOGGING) logger.info(`[COMMAND] Removed ${ name } from guild ${ interaction.guildId }`);
						})
				});
		})
		.catch(async (error) => {
			await interaction.editReply(error ?? messages.UnspecifiedError);
			logger.error(error);
		});
};
