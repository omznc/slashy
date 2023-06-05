// This module loads config.json and provides its values for importing
import { ConfigTypes } from "./configTypes";

let config = require("../../config/config.json");

config.DISCORD_TOKEN = process.env.DISCORD_TOKEN || config.DISCORD_TOKEN;
config.DISCORD_CLIENT_ID =
  process.env.DISCORD_CLIENT_ID || config.DISCORD_CLIENT_ID;
config.TOPGG_TOKEN = process.env.TOPGG_TOKEN || config.TOPGG_TOKEN;

/**
 * Gets the requested config values.
 * @param {ConfigTypes[]} requestedConfigs The config values to get.
 * @returns {Object} The requested config values in an object where the keys are the config types.
 */
export const getConfigs = (
  requestedConfigs: ConfigTypes[]
): { [key in ConfigTypes]: any } => {
  return requestedConfigs.reduce((configs, configName) => {
    configs[configName] = config[configName];
    return configs;
  }, {} as { [key in ConfigTypes]: any });
};
