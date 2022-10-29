import { ApplicationCommand } from "discord.js";
import { ConfigTypes } from "./configTypes";

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const config = require('./config').getConfigs([ ConfigTypes.DISCORD_TOKEN, ConfigTypes.DISCORD_CLIENT_ID ])
const rest = new REST({ version: '9' }).setToken(config.DISCORD_TOKEN);

/**
 * Registers a Guild command. Uses an API call.
 * @param {string} guildId The ID of the guild to register the command to.
 * @param {ApplicationCommand} command The command to register.
 * @returns {Promise<ApplicationCommand>} The command that was registered.
 */
export const RegisterGuildCommandAPI = async (
	guildId: string,
	command: ApplicationCommand
):
	Promise<ApplicationCommand> => {
	return rest.post(
			Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
			{ body: command },
		)
		.then((response: ApplicationCommand) => response);
}

/**
 * Edits a Guild command. Uses an API call.
 * @param {string} guildId The ID of the guild in which to edit the command.
 * @param {string} commandId The ID of the command to edit.
 * @param {string | null} description The new description of the command. If null, the current one will be kept.
 * @param {boolean | null} ephemeral Whether the command will be ephemeral or not. If null, the current setting will be kept.
 */
export const EditGuildCommandAPI = async (
	guildId: string,
	commandId: string,
	description?: string,
	ephemeral?: boolean
): Promise<void> => {
	return rest.patch(
		Routes.applicationGuildCommand(config.DISCORD_CLIENT_ID, guildId, commandId),
		{ body: { description, ephemeral } }
	)
}

/**
 * Deletes a Guild command. Uses an API call.
 * @param {string} guildId The Guild from which to remove the command.
 * @param {string} commandId commandId The ID of the command to remove.
 */
export const RemoveGuildCommandAPI = async (
	guildId: string,
	commandId: string
): Promise<void> => {
	return rest.delete(
		Routes.applicationGuildCommand(config.DISCORD_CLIENT_ID, guildId, commandId),
	)
}

