import { logger } from "@utils/logger";
import { Client } from "@utils/discord";
import config from "@config";
import { ActivityOptions, ActivityType } from "discord.js";

const activities = [
	{
		name: "/slashy help",
		type: ActivityType.Listening,
	},
	{
		name: "/slashy stats",
		type: ActivityType.Watching,
	},
] as ActivityOptions[];

// This task simply updates the now playing status.
module.exports = {
	name: "updateActivity",
	frequency: `*/5 * * * *`,
	async execute() {
		const activity =
			activities[Math.floor(Math.random() * activities.length)];
		Client.user!.setActivity(activity);

		if (config.EXTRA_LOGGING)
			logger.info(`Updated activity to ${activity.name}`);
	},
};
