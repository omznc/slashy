import type { Env } from "../types";

type PostHogClient = import("posthog-node").PostHog;
type CaptureOptions = Parameters<PostHogClient["capture"]>[0];

let client: PostHogClient | null | undefined;

const resolveHost = (env: Env) => env.POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";

export const loadPostHog = async (env: Env): Promise<PostHogClient | null> => {
	const key = env.POSTHOG_KEY?.trim();

	if (!key) {
		client = null;
		return null;
	}

	if (client) return client;
	if (client === null) return null;

	const { PostHog } = await import("posthog-node");
	client = new PostHog(key, { host: resolveHost(env) });

	return client;
};

const resetClient = () => {
	if (client !== null) client = undefined;
};

export const captureEvent = async (env: Env, options: CaptureOptions) => {
	const instance = await loadPostHog(env);

	if (!instance) return;

	try {
		await instance.capture(options);
	} catch {}

	try {
		await instance.shutdown();
	} catch {}

	resetClient();
};
