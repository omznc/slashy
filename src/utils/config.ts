// This module loads config.json and provides its values for importing
let config = require('../../config.json');

config.IS_PROD = process.argv.includes('--production');
config.TOKEN = config.IS_PROD ? config.TOKEN.PROD : config.TOKEN.DEV
config.CLIENT_ID = config.IS_PROD ? config.CLIENT_ID.PROD : config.CLIENT_ID.DEV

/**
 * Gets the requested config values.
 * @param {string[]} neededConfigs The config values to get.
 * @returns {{ string: any }} The config values as an object - configName: configValue.
 */
export const getConfigs = (neededConfigs: string[]): { [p: string]: any } => {
	neededConfigs.forEach(configName => {
		if (config[configName] == null) throw new Error(`Config ${configName} not found`);
	});

	return neededConfigs.reduce((configs, configName) => {
		configs[configName] = config[configName];
		return configs;
	}, {} as { [key: string]: any });
}
