import { REST } from "@discordjs/rest";

export const createRestClient = (token: string) => {
	const rest = new REST({ version: "10" });

	return rest.setToken(token);
};
