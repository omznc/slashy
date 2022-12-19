import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	CommandInteraction,
	CommandInteractionOption,
	CommandInteractionOptionResolver,
	GuildMemberRoleManager,
	TextChannel
} from "discord.js";
import { messages } from "../text/messages";
import { help } from "./help";
import { add } from "./add";
import { remove } from "./remove";
import { list } from "./list";
import { config } from "./config";
import { stats } from "./stats";
import { edit } from "./edit";
import { logger } from "../utils/logger";
import { AddGuildCommand, GetGuildCommand, GetGuildCommands, GetGuildPermission } from "../database/methods";
import { Command } from "@prisma/client";
import { ConfigTypes } from "../utils/configTypes";

const _config = require('../utils/config').getConfigs([ ConfigTypes.DEVELOPERS ]);

/**
 * Returns the command options as a map
 * @param {CommandInteraction} interaction The command interaction
 * @returns {Map<string, string>} The command options
 */
function getOptions(interaction: CommandInteraction): Map<string, any> {
	return new Map<string, any>(
		(interaction.options as CommandInteractionOptionResolver).data[0].options?.map(
			(option: CommandInteractionOption) => [ option.name, option.value ]
		)
	);
}

/**
 * Checks if a command is run in a guild
 * @param {CommandInteraction} interaction The command interaction
 * @returns {boolean} If the command is run in a guild
 */
async function isInGuild(interaction: CommandInteraction): Promise<boolean> {
	const result = interaction.inGuild()
	if (!result) await interaction.editReply(messages.CommandServerOnlyError);
	return result;
}

/**
 * Checks if the user has the required role to use a command
 * @param {CommandInteraction} interaction The command interaction
 * @returns {boolean} If the user has the required role or is the owner
 */
async function hasPermission(interaction: CommandInteraction): Promise<boolean> {
	if (_config.DEVELOPERS.includes(interaction.user.id)) return true;
	const roleId = await GetGuildPermission(interaction.guildId!);
	let result: boolean;
	if (interaction.guild!.ownerId == interaction.member!.user.id) return true;
	result = roleId == "OWNER" ? interaction.member!.user.id ==
		interaction.guild!.ownerId : (interaction.member!.roles as GuildMemberRoleManager).cache.has(roleId);

	if (!result) await interaction.editReply(messages.CommandNoPermissionError);
	return result;
}

/**
 * Checks if a command is run in a guild and if the user has the permission to run the command
 * @param {CommandInteraction} interaction The command interaction
 * @returns {boolean} If the command is run in a guild and if the user has the permission to run the command
 */
async function checkPrerequisites(interaction: CommandInteraction): Promise<boolean> {
	return isInGuild(interaction)
		.then(async (inGuild) => {
			if (!inGuild) return false;
			return hasPermission(interaction)
				.then((hasPermissions) => hasPermissions);
		});
}

/**
 * Returns an object with all the placeholder information for the command
 * @param {CommandInteraction} interaction The command interaction
 * @returns {{ [key: string]: string }} The placeholder information
 */
function getPlaceholders(interaction: CommandInteraction): { [key: string]: string } {
	return {
		"[[user]]": interaction.user.toString(),
		"[[user.id]]": interaction.user.id,
		"[[user.name]]": interaction.user.username,
		"[[owner]]": `<@${ interaction.guild!.ownerId }>`,
		"[[owner.id]]": interaction.guild!.ownerId,
		"[[server]]": interaction.guild!.name,
		"[[user.avatar]]": interaction.user.avatarURL({ forceStatic: true }) ?? "",
		"[[server.id]]": interaction.guild!.id,
		"[[server.member_count]]": interaction.guild!.memberCount.toString(),
		"[[channel]]": (interaction.channel as TextChannel).toString()
	};
}

/**
 * Parses the original reply and replaces all placeholders with the correct information
 * @param {CommandInteraction} interaction The command interaction
 * @param {string} reply The original reply
 * @returns {string | undefined} The parsed reply or undefined if the formatted reply would exceed the character limit
 */
async function ParsePlaceholders(interaction: CommandInteraction, reply: string): Promise<string | undefined> {
	for (const [ key, value ] of Object.entries(getPlaceholders(interaction))) reply = reply.replaceAll(key, value);
	if (reply.length > 2000) {
		await interaction.editReply(messages.CommandReplyTooLongError);
		return undefined;
	}
	return reply;
}

/**
 * Handles name autocomplete for /edit and /remove commands
 * @param {AutocompleteInteraction} interaction The interaction to handle
 */
export const handleAutocomplete = async (interaction: AutocompleteInteraction): Promise<void> => {
	if (!interaction.inGuild()) {
		await interaction.respond(Array(5).fill(null).map(() => ({
			name: messages.CommandServerOnlyError,
			value: "dont-autocomplete-this-command"
		})));
		return;
	}
	const guildCommandNames = (await GetGuildCommands(interaction.guildId)).map((command: Command) => command.name);

	if (guildCommandNames.length == 0) {
		await interaction.respond(Array(5).fill(null).map(() => ({
			name: messages.CommandListNoCommandsError,
			value: "dont-autocomplete-this-command"
		})));
		return;
	}

	// Send up to 25 command names that include the input
	await interaction.respond(guildCommandNames.filter(name => name.includes(interaction.options.data[0].options?.[0].value as string ??
			""))
		.map(name => ({
			name: name,
			value: name
		})).slice(0, 25)
	);
}

/**
 * Handles global /slashy commands. There has to be a better way to do this, right?`
 * @param {CommandInteraction} interaction The interaction to handle
 */
export const handleGlobalCommand = async (interaction: CommandInteraction): Promise<void> => {
	await interaction.deferReply({ ephemeral: true });
	switch ((interaction as ChatInputCommandInteraction).options.getSubcommand()) {
		case "add":
			if (await checkPrerequisites(interaction)) await add(interaction, getOptions(interaction));
			break;

		case "remove":
			if (await checkPrerequisites(interaction)) await remove(interaction, getOptions(interaction));
			break;

		case "edit":
			if (await checkPrerequisites(interaction)) await edit(interaction, getOptions(interaction));
			break;

		case "config":
			if (await checkPrerequisites(interaction)) await config(interaction, getOptions(interaction));
			break;

		case "list":
			logger.info("Listing commands");
			if (await isInGuild(interaction)) await list(interaction);
			break;

		case "help":
			await help(interaction);
			break;

		case "stats":
			await stats(interaction);
			break;

		default:
			await interaction.editReply(messages.CommandUnknown);
	}

}

/**
 * Handles custom user commands
 * @param {CommandInteraction} interaction The interaction to handle
 */
export const handleUserCommand = async (interaction: CommandInteraction): Promise<void> => {
	if (interaction.commandName == 'slashy') {
		await interaction.reply(messages.CommandSlashyCategory);
		return;
	}
	await GetGuildCommand(
		interaction.guildId!,
		interaction.commandName
	)
		.then(async command => {
			const content = await ParsePlaceholders(interaction, command.reply);
			if (content == undefined) return;
			await interaction.reply({
				content: content,
				ephemeral: command.ephemeral
			});
		})
		.catch(async error => {
			await AddGuildCommand(
				interaction.guildId!,
				interaction.commandId,
				interaction.commandName,
				"You should probably change this with `/slashy edit`.",
				interaction.command?.description ?? "A command made by Slashy.",
				false
			)
			await interaction.reply(messages.CommandUnknownCustom);
			logger.error(error);
		});
}
