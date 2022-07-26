import { Client } from 'discord.js';
import SlashyCommands from "../commands/command-builder";
import { logger } from "../utils/logger";
import { RemoveLeftGuilds } from "../database/methods";

const config = require('../utils/config').getConfigs([ 'IS_PROD' ]);

module.exports = {
	name: 'ready',
	once: true,
	async execute(client: Client) {
		logger.info(`Logged in as ${client.user?.tag} in ${client.guilds.cache.size} guilds!`)

		if (process.argv.includes('--publish-commands')) await SlashyCommands.publish().then(() => process.exit(0));
		if (process.argv.includes('--clear-commands')) await SlashyCommands.clear().then(() => process.exit(0));

		// Unsure how this will scale, but it should be fine for now.
		if (config.IS_PROD) {
			await RemoveLeftGuilds(client.guilds.cache.map(guild => guild.id))
				.then(() => logger.info('Removed inactive guilds from database.'))
				.catch(err => logger.error(err));
		} else { logger.info('Not removing inactive guilds from database in non-production mode.') }
	},
};
