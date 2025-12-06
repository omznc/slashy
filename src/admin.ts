import type { REST } from "@discordjs/rest";
import { DiscordAPIError } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ensureBaseCommand } from "./discord/registration";
import { createRestClient } from "./discord/rest-client";
import type { Env } from "./types";

let cachedSecret: string | null = null;
let loggedGenerated = false;

const resolveSecret = (env: Env) => {
	if (cachedSecret) return cachedSecret;

	const existing = env.SLASHY_SECRET?.trim();
	if (existing) {
		cachedSecret = existing;
		return cachedSecret;
	}

	cachedSecret = crypto.randomUUID();

	if (!loggedGenerated) {
		console.log("[slashy] generated admin secret", cachedSecret);
		loggedGenerated = true;
	}

	return cachedSecret;
};

export const primeAdminSecret = (env: Env) => resolveSecret(env);

const getBearer = (authorization: string | null) => {
	if (!authorization) return "";
	if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();

	return authorization.trim();
};

const authorized = (request: Request, env: Env) => {
	const secret = resolveSecret(env);
	const url = new URL(request.url);
	const header = getBearer(request.headers.get("authorization"));
	const xHeader = request.headers.get("x-slashy-secret")?.trim();
	const query = url.searchParams.get("secret")?.trim();

	return secret && (header === secret || xHeader === secret || query === secret);
};

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

type GuildCommandShape = {
	id: string;
	name: string;
	description?: string;
	type?: number;
};

const mapGuildCommand = (cmd: GuildCommandShape) => ({
	name: cmd.name,
	description: cmd.description || "A command made by Slashy.",
	type: 1,
});

const resetGlobal = async (rest: REST, appId: string) => {
	await ensureBaseCommand({ rest, appId });
};

const resetGuild = async (rest: REST, appId: string, guildId: string) => {
	const existing = (await rest.get(Routes.applicationGuildCommands(appId, guildId))) as GuildCommandShape[];
	const recreated = existing.filter((cmd) => cmd.name !== "slashy" && cmd.type === 1).map(mapGuildCommand);

	await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: recreated });
	return recreated.length;
};

export const handleAdmin = async (request: Request, env: Env) => {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/admin")) return undefined;

	const secret = resolveSecret(env);
	if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

	const rest = createRestClient(env.DISCORD_TOKEN);

	if (url.pathname === "/admin/register-base") {
		await ensureBaseCommand({ rest, appId: env.DISCORD_APP_ID });
		return json({ ok: true });
	}

	if (url.pathname === "/admin/reset-commands") {
		const guildParam = url.searchParams.get("guildId") ?? url.searchParams.get("guild");
		const guildIds = guildParam
			? guildParam
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];

		const result: { global: string; guilds: { id: string; status: string; recreated?: number; error?: string }[] } =
			{ global: "ok", guilds: [] };

		await resetGlobal(rest, env.DISCORD_APP_ID);

		for (const gid of guildIds) {
			try {
				const recreated = await resetGuild(rest, env.DISCORD_APP_ID, gid);
				result.guilds.push({ id: gid, status: "ok", recreated });
			} catch (error) {
				if (
					error instanceof DiscordAPIError &&
					(error.status === 403 || error.status === 404 || error.code === 50001)
				) {
					result.guilds.push({ id: gid, status: "skipped", error: "missing access" });
					continue;
				}
				result.guilds.push({ id: gid, status: "error", error: String(error) });
			}
		}
		return json({ secret, ...result });
	}
	return json({ error: "not found" }, 404);
};
