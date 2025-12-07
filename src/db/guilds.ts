import type { Env } from "../types";

export type GuildInfo = {
	banned: boolean;
	maxCommands: number;
};

export type EnsureGuildResult = GuildInfo & { created: boolean };

type GuildRow = {
	banned: number;
	maxCommands: number;
};

export type EnsureGuildInput = {
	guildId: string;
	env: Env;
};

export const ensureGuild = async ({ guildId, env }: EnsureGuildInput): Promise<EnsureGuildResult> => {
	const defaultMax = Number.isFinite(Number(env.MAX_COMMANDS)) ? Number(env.MAX_COMMANDS) : 50;
	const insertResult = await env.DB.prepare("INSERT OR IGNORE INTO guilds (id, max_commands) VALUES (?, ?)").bind(guildId, defaultMax).run();
	const created = insertResult.meta.changes > 0;

	const row = await env.DB.prepare("SELECT banned, max_commands AS maxCommands FROM guilds WHERE id = ?").bind(guildId).first<GuildRow>();

	return {
		banned: !!row?.banned,
		maxCommands: row?.maxCommands ?? defaultMax,
		created,
	};
};

export type GuildCommandCountInput = {
	guildId: string;
	env: Env;
};

export const guildCommandCount = async ({ guildId, env }: GuildCommandCountInput) => {
	const row = await env.DB.prepare("SELECT COUNT(*) as count FROM commands WHERE guild_id = ?").bind(guildId).first<{ count: number }>();

	return row?.count ?? 0;
};
