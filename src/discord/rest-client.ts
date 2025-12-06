import { REST } from "@discordjs/rest";

export const createRestClient = (token: string) => new REST({ version: "10" }).setToken(token);
