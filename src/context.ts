import { createRestClient } from "./discord/rest-client";
import type { Env, HandlerContext } from "./types";

export const createHandlerContext = (env: Env): HandlerContext => ({
	env,
	rest: createRestClient(env.DISCORD_TOKEN),
});
