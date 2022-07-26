import { logger } from "../utils/logger";

module.exports = {
	name: 'debug',
	once: false,
	async execute(debug: string) {
		logger.debug(debug)
	},
};
