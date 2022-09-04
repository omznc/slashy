// This module loads config.json and provides its values for importing
let config = require('../../config/config.json');

config.DISCORD_TOKEN = process.env.DISCORD_TOKEN || config.DISCORD_TOKEN;
config.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || config.DISCORD_CLIENT_ID;
config.TOPGG_TOKEN = process.env.TOPGG_TOKEN || config.TOPGG_TOKEN;

/**
 * Gets the requested config values.
 * @param {string[]} neededConfigs The config values to get.
 * @returns {{ string: any }} The config values as an object - configName: configValue.
 */
export const getConfigs = (neededConfigs: string[]): { [p: string]: any } => {
	return neededConfigs.reduce((configs, configName) => {
		configs[configName] = config[configName];
		return configs;
	}, {} as { [key: string]: any });
}

/**
 * Sets a config value.
 * @param configName The config name to set.
 * @param configValue The value to set the config value to.
 */
export const setConfig = (configName: string, configValue: any): void => {
	config[configName] = configValue;
	require('fs').writeFileSync('./config/config.json', JSON.stringify(config, null, 4));
}
