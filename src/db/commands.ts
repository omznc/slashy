import type { Env } from "../types";

export type CommandRecord = {
	id: string;
	reply: string;
	description: string;
	ephemeral: boolean;
	uses: number;
	allowedRoles: string[];
};

export type ListedCommand = {
	name: string;
	description: string;
	uses: number;
	ephemeral: boolean;
	allowedRoles: string[];
};

export type UpsertCommandInput = {
	id: string;
	guildId: string;
	name: string;
	reply: string;
	description: string;
	ephemeral: boolean;
	allowedRoles: string[];
};

type CommandRow = {
	id: string;
	reply: string;
	description: string;
	ephemeral: number;
	uses: number;
	allowed_roles: string;
};

type ListedCommandRow = {
	name: string;
	description: string;
	uses: number;
	ephemeral: number;
	allowed_roles: string;
};

export type GetCommandInput = {
	guildId: string;
	name: string;
	env: Env;
};

const parseAllowedRoles = (raw: string | null | undefined) => {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((entry) => (typeof entry === "string" ? entry.trim() : ""))
			.filter(Boolean)
			.slice(0, 25);
	} catch {
		return [];
	}
};

const serializeAllowedRoles = (roles: string[]) => {
	const normalized = roles.map((role) => role.trim()).filter(Boolean);
	const unique = [...new Set(normalized)].slice(0, 25);
	return JSON.stringify(unique);
};

export const getCommand = async ({ guildId, name, env }: GetCommandInput): Promise<CommandRecord | undefined> => {
	const row = await env.DB.prepare("SELECT id, reply, description, uses, ephemeral, allowed_roles FROM commands WHERE guild_id = ? AND name = ?")
		.bind(guildId, name)
		.first<CommandRow>();

	if (!row) return undefined;

	return {
		id: row.id,
		reply: row.reply,
		description: row.description,
		ephemeral: !!row.ephemeral,
		uses: row.uses,
		allowedRoles: parseAllowedRoles(row.allowed_roles),
	};
};

export type IncrementCommandUsesInput = {
	commandId: string;
	env: Env;
};

export const incrementCommandUses = async ({ commandId, env }: IncrementCommandUsesInput) => {
	await env.DB.prepare("UPDATE commands SET uses = uses + 1 WHERE id = ?").bind(commandId).run();
};

export type ListCommandsInput = {
	guildId: string;
	env: Env;
};

export const listCommands = async ({ guildId, env }: ListCommandsInput): Promise<ListedCommand[]> => {
	const result = await env.DB.prepare("SELECT name, description, uses, ephemeral, allowed_roles FROM commands WHERE guild_id = ? ORDER BY name")
		.bind(guildId)
		.all<ListedCommandRow>();

	return result.results.map((row) => ({
		name: row.name,
		description: row.description,
		uses: row.uses,
		ephemeral: !!row.ephemeral,
		allowedRoles: parseAllowedRoles(row.allowed_roles),
	}));
};

export type RemoveCommandInput = {
	guildId: string;
	name: string;
	env: Env;
};

export const removeCommand = async ({ guildId, name, env }: RemoveCommandInput): Promise<CommandRecord | undefined> => {
	const row = await env.DB.prepare(
		"DELETE FROM commands WHERE guild_id = ? AND name = ? RETURNING id, reply, description, uses, ephemeral, allowed_roles",
	)
		.bind(guildId, name)
		.first<CommandRow>();

	if (!row) return undefined;

	return {
		id: row.id,
		reply: row.reply,
		description: row.description,
		ephemeral: !!row.ephemeral,
		uses: row.uses,
		allowedRoles: parseAllowedRoles(row.allowed_roles),
	};
};

export type UpsertCommandParams = UpsertCommandInput & { env: Env };

export const upsertCommand = async (input: UpsertCommandParams) => {
	const { id, guildId, name, reply, description, ephemeral, allowedRoles, env } = input;

	await env.DB.prepare(
		"INSERT INTO commands (id, guild_id, name, reply, description, ephemeral, allowed_roles) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (guild_id, name) DO UPDATE SET reply = excluded.reply, description = excluded.description, ephemeral = excluded.ephemeral, allowed_roles = excluded.allowed_roles",
	)
		.bind(id, guildId, name, reply, description, ephemeral ? 1 : 0, serializeAllowedRoles(allowedRoles))
		.run();
};

export type UpdateCommandInput = {
	guildId: string;
	originalName: string;
	name: string;
	reply: string;
	description: string;
	ephemeral: boolean;
	allowedRoles: string[];
	env: Env;
};

export const updateCommand = async ({ guildId, originalName, name, reply, description, ephemeral, allowedRoles, env }: UpdateCommandInput) => {
	await env.DB.prepare("UPDATE commands SET name = ?, reply = ?, description = ?, ephemeral = ?, allowed_roles = ? WHERE guild_id = ? AND name = ?")
		.bind(name, reply, description, ephemeral ? 1 : 0, serializeAllowedRoles(allowedRoles), guildId, originalName)
		.run();
};
