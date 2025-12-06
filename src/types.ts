import type { REST } from "@discordjs/rest";

export type Env = {
	DISCORD_PUBLIC_KEY: string;
	DISCORD_TOKEN: string;
	DISCORD_APP_ID: string;
	SLASHY_SECRET?: string;
	POSTHOG_KEY?: string;
	POSTHOG_HOST?: string;
	DB: D1Database;
};

export type HandlerContext = {
	env: Env;
	rest: REST;
};
