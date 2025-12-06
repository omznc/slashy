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
	await env.DB.prepare("INSERT OR IGNORE INTO guilds (id) VALUES (?)").bind(guildId).run();

	const row = await env.DB.prepare("SELECT premium, banned, max_commands AS maxCommands FROM guilds WHERE id = ?")
		.bind(guildId)
		.first<GuildRow>();

	return {
		premium: !!row?.premium,
		banned: !!row?.banned,
		maxCommands: row?.maxCommands ?? 30,
	};
};

export const guildCommandCount = async (guildId: string, env: Env) => {
	const row = await env.DB.prepare("SELECT COUNT(*) as count FROM commands WHERE guild_id = ?")
		.bind(guildId)
		.first<{ count: number }>();

	return row?.count ?? 0;
};
