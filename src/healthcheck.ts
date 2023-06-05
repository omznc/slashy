import { Client } from "./utils/discord";

export const healthcheck = async (): Promise<boolean> => Client.ws.status === 0;
