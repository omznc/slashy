import { createRestClient } from "./discord/rest-client";
import type { Env, HandlerContext } from "./types";

export const createHandlerContext = (env: Env): HandlerContext => {
	const rest = createRestClient(env.DISCORD_TOKEN);

	return { env, rest };
};
