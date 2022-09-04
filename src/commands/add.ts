import { ApplicationCommand, CommandInteraction } from "discord.js";
import { AddGuildCommand, DoesCommandExist, GetGuildBanned, GetGuildCommandLimitInfo } from "../database/methods";
import { isValidCommandName, isValidDescription, isValidReply } from "../utils/helpers";
import { RegisterGuildCommandAPI, RemoveGuildCommandAPI } from "../utils/commands-api";
import { messages } from "../text/messages";
import { DiscordAPIError } from "@discordjs/rest";
import { logger } from "../utils/logger";

const config = require('../utils/config').getConfigs([ 'EXTRA_LOGGING' ]);

const { SlashCommandBuilder } = require('@discordjs/builders');
const DefaultDescription = "A command made by Slashy."

// Handler for /slashy add <name:str> <reply:str> [description:str] [ephemeral:bool]
export const add = async (
	interaction: CommandInteraction,
	options: Map<string, any>
): Promise<void> => {
	await GetGuildBanned(interaction.guildId!)
		.then(isBanned => {
			if (isBanned) return Promise.reject(messages.CommandGuildBannedError);
		})
		.then(async () => {
			await GetGuildCommandLimitInfo(interaction.guildId!)
				.then(([ max, current ]) => {
					if (current >= max) return Promise.reject(messages.CommandLimitReachedSlashy.replace("{max}", max.toString()));
				})
		})
		.then(async () => {

			// Name Validation
			const name: string = options.get("name").replace(/ /g, "_").toLowerCase().trim();
			if (!isValidCommandName(name) || await DoesCommandExist(interaction.guildId!, name)) return Promise.reject(messages.CommandNameInvalidError)

			// Reply Validation
			const reply: string = options.get("reply");
			if (!isValidReply(reply)) return Promise.reject(messages.CommandReplyInvalidError)

			// Description Validation
			const description: string = options.get("description") ?? DefaultDescription;
			if (!isValidDescription(description)) return Promise.reject(messages.CommandDescriptionInvalidError)

			const ephemeral: boolean = options.get("ephemeral") ?? false;

			// All validations passed, add command
			await RegisterGuildCommandAPI(
				interaction.guildId!,
				new SlashCommandBuilder()
					.setName(name)
					.setDescription(description)
			)
				.then(async (command: ApplicationCommand) => {
					// Add command to database
					await AddGuildCommand(
						interaction.guildId!,
						command.id,
						command.name,
						reply,
						command.description,
						ephemeral
					)
						.then(async () => {
							await interaction.editReply(messages.CommandAdded);
							if (config.EXTRA_LOGGING) logger.info(`[COMMAND] Added ${name} to guild ${interaction.guildId}`);
						})
						.catch(async (error) => {
							await RemoveGuildCommandAPI(interaction.guildId!, command.id);
							logger.error(error);
						});
				})
				.catch((err: DiscordAPIError | Error) => {
					if (err instanceof DiscordAPIError) if (err.code === 30032) return Promise.reject(messages.CommandLimitReachedDiscord);
					logger.error(err);
					return Promise.reject(messages.UnspecifiedError);
				});
		})
		.catch(async (error) => {
			await interaction.editReply(error ?? messages.UnspecifiedError);
			logger.error(error);
		});
};
