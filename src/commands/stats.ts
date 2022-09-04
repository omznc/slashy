import { CommandInteraction, EmbedBuilder } from "discord.js";
import { GetTotalCommandsInAllServers, GetTotalCommandsRunInAllServers } from "../database/methods";
import { logger } from "../utils/logger";
import { messages } from "../text/messages";

const config = require('../utils/config').getConfigs([ 'COLOR', 'LOGO' ]);

export const stats = async (interaction: CommandInteraction): Promise<void> => {
	await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle('Slashy\'s Stats')
					.setColor(config.COLOR)
					.setThumbnail(config.LOGO)
					.setDescription(`Here are some stats about Slashy.${ interaction.inGuild() ? '' : '\nRun this command in a server to get into the specifics.' }`)
					.addFields([
						{
							name: 'Guilds',
							value: `Hanging out in **${ interaction.client.guilds.cache.size }** servers.${ interaction.inGuild() ? '\nYou\'re one of them!' : '' }`
						},
						{
							name: 'Users',
							value: `That\'s a total of **${ interaction.client.guilds.cache.reduce((acc, guild) => acc +
								guild.memberCount, 0) }** users... crazy right!?`
						},
						{
							name: 'Commands',
							value: `I manage **${ await GetTotalCommandsInAllServers() }** commands, and I ran **${ await GetTotalCommandsRunInAllServers() }** commands in total.`
						}
					])
			]
		})
		.catch(async error => {
			await interaction.editReply(error ?? messages.UnspecifiedError);
			logger.error(error);
		})

};
