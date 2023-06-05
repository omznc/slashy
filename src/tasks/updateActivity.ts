import { logger } from "../utils/logger";
import { Client } from "../utils/discord";
import { ConfigTypes } from "../utils/configTypes";

const config = require("../utils/config").getConfigs([
  ConfigTypes.ACTIVITIES,
  ConfigTypes.EXTRA_LOGGING,
  ConfigTypes.ACTIVITIES_FREQUENCY_MINUTES,
]);

// This task simply updates the now playing status.
module.exports = {
  name: "updateActivity",
  frequency: `*/${config.ACTIVITIES_FREQUENCY_MINUTES} * * * *`,
  async execute() {
    const activity =
      config.ACTIVITIES[Math.floor(Math.random() * config.ACTIVITIES.length)];
    Client.user!.setActivity(activity);

    if (config.EXTRA_LOGGING)
      logger.info(`Updated activity to ${activity.name}`);
  },
};
