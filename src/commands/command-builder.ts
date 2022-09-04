import {
	SlashCommandBooleanOption,
	SlashCommandRoleOption,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder
} from "@discordjs/builders";
import { logger } from "../utils/logger";

const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('../utils/config').getConfigs([ 'DISCORD_CLIENT_ID', 'DISCORD_TOKEN' ]);

const rest = new REST({ version: '9' }).setToken(config.DISCORD_TOKEN);

const options = {
	name: (required: boolean = true, autocomplete: boolean = false) => (option: SlashCommandStringOption) => option.setName('name').setDescription('The name of the command.').setRequired(required).setAutocomplete(autocomplete),
	description: (required: boolean = true) => (option: SlashCommandStringOption) => option.setName('description').setDescription('The response of the command.').setRequired(required),
	reply: (required: boolean = true) => (option: SlashCommandStringOption) => option.setName('reply').setDescription('The response of the command.').setRequired(required),
	ephemeral: (required: boolean = true) => (option: SlashCommandBooleanOption) => option.setName('ephemeral').setDescription('Will the reply be invisible to everyone else?').setRequired(required),
	role: (required: boolean = false) => (option: SlashCommandRoleOption) => option.setName('role').setDescription('Role required to manage Slashy.').setRequired(required),
}

class Commands {
	public command: typeof SlashCommandBuilder;

	constructor(data: typeof SlashCommandBuilder) {
		this.command = data;
	}

	// Clears all commands from Discord. Uses an API call.
	async clear() {
		await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID),
				{ body: [] })
			.then(() => logger.info('Cleared Global (/) Commands'))
			.catch((err: Error) => logger.error(err));
	}

	// Publishes all commands to Discord. Uses an API call.
	async publish() {
		await rest.put(
				Routes.applicationCommands(config.DISCORD_CLIENT_ID),
				{ body: [ this.command ] },
			)
			.then(() => logger.info("Published Global (/) Commands"))
			.catch((err: Error) => logger.error(err));
	}

	// Clears then publishes all commands to Discord. Uses an API call.
	async refresh() {
		await Promise.all([ this.clear(), this.publish() ])
	}
}

const SlashyCommands = new Commands(
	new SlashCommandBuilder()
		.setName('slashy')
		.setDescription('Root command.')

		// ADD
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('add')
				.setDescription('Add a custom command.')
				.addStringOption(options.name())
				.addStringOption(options.reply())
				.addStringOption(options.description(false))
				.addBooleanOption(options.ephemeral(false))
		)

		// REMOVE
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('remove')
				.setDescription('Remove a custom command.')
				.addStringOption(options.name(true, true))
		)

		// EDIT
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('edit')
				.setDescription('Edit a custom command.')
				.addStringOption(options.name(true, true))
				.addStringOption(options.reply(false))
				.addStringOption(options.description(false))
				.addBooleanOption(options.ephemeral(false))
		)

		// CONFIG
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('config')
				.setDescription('Edit Slashy\'s configuration.')
				.addRoleOption(options.role(false))
		)

		// LIST
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('list')
				.setDescription('List all custom commands for the current server.')
		)

		// HELP
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('help')
				.setDescription('Show this help message.')
		)

		// STATS
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('stats')
				.setDescription('Show statistics about the bot.')
		)
);

const subcommands: string[] = [];
SlashyCommands.command.options.forEach((option: any) => subcommands.push(`slashy ${ option.name }`));

export default SlashyCommands;
export { subcommands };

