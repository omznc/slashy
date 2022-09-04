// This checks if the discord bot is online and working, used by Docker to check if the bot is online
import { Client } from './utils/discord';

export const healthcheck = async () => {
	return Client.ws.status === 0;
};

