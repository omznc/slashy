import type { REST } from "@discordjs/rest";
import { DiscordAPIError } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ensureBaseCommand } from "./discord/registration";
import { createRestClient } from "./discord/rest-client";
import { t } from "./i18n";
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

type AuthorizedInput = {
	request: Request;
	env: Env;
};

const authorized = ({ request, env }: AuthorizedInput) => {
	const secret = resolveSecret(env);
	const url = new URL(request.url);
	const header = getBearer(request.headers.get("authorization"));
	const xHeader = request.headers.get("x-slashy-secret")?.trim();
	const query = url.searchParams.get("secret")?.trim();

	return secret && (header === secret || xHeader === secret || query === secret);
};

type JsonInput = {
	data: unknown;
	status?: number;
};

const json = ({ data, status = 200 }: JsonInput) =>
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
	description: cmd.description || t("en", "defaultDescription"),
	type: 1,
});

export type ResetGlobalInput = {
	rest: REST;
	appId: string;
};

const resetGlobal = async ({ rest, appId }: ResetGlobalInput) => {
	await ensureBaseCommand({ rest, appId });
};

export type ResetGuildInput = {
	rest: REST;
	appId: string;
	guildId: string;
};

const resetGuild = async ({ rest, appId, guildId }: ResetGuildInput) => {
	const existing = (await rest.get(Routes.applicationGuildCommands(appId, guildId))) as GuildCommandShape[];
	const recreated = existing.filter((cmd) => cmd.name !== "slashy" && cmd.type === 1).map(mapGuildCommand);

	await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: recreated });
	return recreated.length;
};

export type HandleAdminInput = {
	request: Request;
	env: Env;
};

export const handleAdmin = async ({ request, env }: HandleAdminInput) => {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/admin")) return undefined;

	const secret = resolveSecret(env);
	if (!authorized({ request, env })) return json({ data: { error: "unauthorized" }, status: 401 });

	const rest = createRestClient(env.DISCORD_TOKEN);

	if (url.pathname === "/admin/register-base") {
		await ensureBaseCommand({ rest, appId: env.DISCORD_APP_ID });
		return json({ data: { ok: true } });
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

		await resetGlobal({ rest, appId: env.DISCORD_APP_ID });

		for (const gid of guildIds) {
			try {
				const recreated = await resetGuild({ rest, appId: env.DISCORD_APP_ID, guildId: gid });
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
		return json({ data: { secret, ...result } });
	}
	if (url.pathname === "/admin/guild-limit") {
		const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
		const guildId =
			(body as { guildId?: string; guild?: string }).guildId ??
			(body as { guild?: string }).guild ??
			url.searchParams.get("guildId") ??
			url.searchParams.get("guild");
		const limitParam =
			(body as { limit?: unknown; max?: unknown }).limit ??
			(body as { max?: unknown }).max ??
			url.searchParams.get("limit") ??
			url.searchParams.get("max");
		const limit = Number(limitParam);

		if (!guildId) return json({ data: { error: "missing guildId" }, status: 400 });
		if (!Number.isFinite(limit)) return json({ data: { error: "invalid limit" }, status: 400 });

		await env.DB.prepare("INSERT OR IGNORE INTO guilds (id, max_commands) VALUES (?, ?)")
			.bind(guildId, limit)
			.run();
		await env.DB.prepare("UPDATE guilds SET max_commands = ? WHERE id = ?").bind(limit, guildId).run();

		const row = await env.DB.prepare("SELECT max_commands AS maxCommands FROM guilds WHERE id = ?")
			.bind(guildId)
			.first<{ maxCommands: number }>();

		return json({ data: { guildId, maxCommands: row?.maxCommands ?? limit } });
	}
	if (url.pathname === "/admin/guild-ban") {
		const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
		const guildId =
			(body as { guildId?: string; guild?: string }).guildId ??
			(body as { guild?: string }).guild ??
			url.searchParams.get("guildId") ??
			url.searchParams.get("guild");
		const bannedParam =
			(body as { banned?: unknown; ban?: unknown }).banned ??
			(body as { ban?: unknown }).ban ??
			url.searchParams.get("banned") ??
			url.searchParams.get("ban");

		if (!guildId) return json({ data: { error: "missing guildId" }, status: 400 });
		const bannedString = typeof bannedParam === "string" ? bannedParam.trim().toLowerCase() : bannedParam;
		const banned =
			bannedString === true ||
			bannedString === 1 ||
			bannedString === "1" ||
			bannedString === "true" ||
			bannedString === "yes" ||
			bannedString === "y" ||
			bannedString === "on";
		const bannedValid =
			bannedString === 0 ||
			bannedString === "0" ||
			bannedString === false ||
			bannedString === "false" ||
			bannedString === "no" ||
			bannedString === "n" ||
			bannedString === "off" ||
			banned ||
			bannedString === undefined;

		if (!bannedValid) return json({ data: { error: "invalid banned" }, status: 400 });

		const bannedValue = banned ? 1 : 0;

		await env.DB.prepare("INSERT OR IGNORE INTO guilds (id, banned) VALUES (?, ?)")
			.bind(guildId, bannedValue)
			.run();
		await env.DB.prepare("UPDATE guilds SET banned = ? WHERE id = ?").bind(bannedValue, guildId).run();

		const row = await env.DB.prepare("SELECT banned FROM guilds WHERE id = ?")
			.bind(guildId)
			.first<{ banned: number }>();

		return json({ data: { guildId, banned: !!row?.banned } });
	}
	return json({ data: { error: "not found" }, status: 404 });
};
