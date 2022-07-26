import { Interaction, InteractionType } from "discord.js";
import { handleAutocomplete, handleGlobalCommand, handleUserCommand } from "../commands/command-handler";

const config = require('../utils/config').getConfigs([ 'CLIENT_ID' ]);

module.exports = {
	name: 'interactionCreate',
	once: false,
	async execute(interaction: Interaction) {

		// Only handle bot interactions
		if (interaction.applicationId != config.CLIENT_ID) return;

		// Handle autocomplete
		if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
			await handleAutocomplete(interaction);
			return;
		}

		if (interaction.type === InteractionType.ApplicationCommand)
			await (interaction.options.data.length != 0 ? handleGlobalCommand(interaction) : handleUserCommand(interaction))
	},
};
