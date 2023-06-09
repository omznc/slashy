import { Guild } from "discord.js";
import { RemoveGuilds } from "@database/methods";
import { logger } from "@utils/logger";
import config from "@config";

module.exports = {
	name: "guildDelete",
	once: false,
	async execute(guild: Guild) {
		if (config.EXTRA_LOGGING)
			logger.info(`[GUILD] Left ${guild.name} (${guild.id})`);

		await RemoveGuilds([guild.id]).catch((error) => logger.error(error));
	},
};
