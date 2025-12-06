import type { Env } from "../types";

export type GuildInfo = {
	premium: boolean;
	banned: boolean;
	maxCommands: number;
};

type GuildRow = {
	premium: number;
	banned: number;
	maxCommands: number;
};

export const ensureGuild = async (guildId: string, env: Env): Promise<GuildInfo> => {
	const defaultMax = Number.isFinite(Number(env.MAX_COMMANDS)) ? Number(env.MAX_COMMANDS) : 50;
	await env.DB.prepare("INSERT OR IGNORE INTO guilds (id, max_commands) VALUES (?, ?)").bind(guildId, defaultMax).run();

	const row = await env.DB.prepare("SELECT premium, banned, max_commands AS maxCommands FROM guilds WHERE id = ?")
		.bind(guildId)
		.first<GuildRow>();

	return {
		premium: !!row?.premium,
		banned: !!row?.banned,
		maxCommands: row?.maxCommands ?? defaultMax,
	};
};

export const guildCommandCount = async (guildId: string, env: Env) => {
	const row = await env.DB.prepare("SELECT COUNT(*) as count FROM commands WHERE guild_id = ?")
		.bind(guildId)
		.first<{ count: number }>();

	return row?.count ?? 0;
};
