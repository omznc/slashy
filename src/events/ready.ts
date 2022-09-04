import { Client } from 'discord.js';
import SlashyCommands from "../commands/command-builder";
import { logger } from "../utils/logger";
import { RemoveLeftGuilds } from "../database/methods";

module.exports = {
	name: 'ready',
	once: true,
	async execute(client: Client) {
		logger.info(`Logged in as ${ client.user?.tag } in ${ client.guilds.cache.size } guilds!`)

		if (process.argv.includes('--test')) {
			logger.error('Test mode enabled. Exiting.');
			process.exit(0);
		}
		if (process.argv.includes('--publish-commands')) await SlashyCommands.publish().then(() => process.exit(0));
		if (process.argv.includes('--clear-commands')) await SlashyCommands.clear().then(() => process.exit(0));
		if (process.argv.includes('--refresh-commands')) await SlashyCommands.refresh().then(() => process.exit(0));

		await RemoveLeftGuilds(client.guilds.cache.map(guild => guild.id))
			.then(() => logger.info('Removed inactive guilds from database.'))
			.catch(err => logger.error(err));
	},
};
