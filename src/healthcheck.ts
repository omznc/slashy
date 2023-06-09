import { Client } from "./utils/discord";

const healthcheck = async (): Promise<boolean> => Client.ws.status === 0;

healthcheck().then((status) => {
	process?.exit(status ? 0 : 1);
});
