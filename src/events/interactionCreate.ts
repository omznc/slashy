import { Interaction } from "discord.js";
import { handleAutocomplete, handleGlobalCommand, handleUserCommand } from "../commands/command-handler";

const config = require('../utils/config').getConfigs([ 'DISCORD_CLIENT_ID' ]);

module.exports = {
	name: 'interactionCreate',
	once: false,
	async execute(interaction: Interaction) {

		// Only handle bot interactions
		if (interaction.applicationId != config.DISCORD_CLIENT_ID) return;

		// Handle autocomplete
		if (interaction.isAutocomplete()) {
			await handleAutocomplete(interaction);
			return;
		}

		// Handle slash commands
		if (interaction.isCommand())
			await (interaction.options.data.length !=
			0 ? handleGlobalCommand(interaction) : handleUserCommand(interaction))
	},
};
