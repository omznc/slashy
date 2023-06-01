import { Client } from "@utils/discordClient";

export const healthcheck = async (): Promise<boolean> => Client.ws.status === 0;
