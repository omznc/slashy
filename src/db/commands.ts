import type { Env } from "../types";

export type CommandRecord = {
	id: string;
	reply: string;
	description: string;
	ephemeral: boolean;
	uses: number;
};

export type ListedCommand = {
	name: string;
	description: string;
	uses: number;
	ephemeral: boolean;
};

export type UpsertCommandInput = {
	id: string;
	guildId: string;
	name: string;
	reply: string;
	description: string;
	ephemeral: boolean;
};

type CommandRow = {
	id: string;
	reply: string;
	description: string;
	ephemeral: number;
	uses: number;
};

type ListedCommandRow = {
	name: string;
	description: string;
	uses: number;
	ephemeral: number;
};

export type GetCommandInput = {
	guildId: string;
	name: string;
	env: Env;
};

export const getCommand = async ({ guildId, name, env }: GetCommandInput): Promise<CommandRecord | undefined> => {
	const row = await env.DB.prepare(
		"SELECT id, reply, description, uses, ephemeral FROM commands WHERE guild_id = ? AND name = ?",
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
	const result = await env.DB.prepare(
		"SELECT name, description, uses, ephemeral FROM commands WHERE guild_id = ? ORDER BY name",
	)
		.bind(guildId)
		.all<ListedCommandRow>();

	return result.results.map((row) => ({
		name: row.name,
		description: row.description,
		uses: row.uses,
		ephemeral: !!row.ephemeral,
	}));
};

export type RemoveCommandInput = {
	guildId: string;
	name: string;
	env: Env;
};

export const removeCommand = async ({ guildId, name, env }: RemoveCommandInput) => {
	await env.DB.prepare("DELETE FROM commands WHERE guild_id = ? AND name = ?").bind(guildId, name).run();
};

export type UpsertCommandParams = UpsertCommandInput & { env: Env };

export const upsertCommand = async (input: UpsertCommandParams) => {
	const { id, guildId, name, reply, description, ephemeral, env } = input;

	await env.DB.prepare(
		"INSERT INTO commands (id, guild_id, name, reply, description, ephemeral) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (guild_id, name) DO UPDATE SET reply = excluded.reply, description = excluded.description, ephemeral = excluded.ephemeral",
	)
		.bind(id, guildId, name, reply, description, ephemeral ? 1 : 0)
		.run();
};

export type UpdateCommandInput = {
	guildId: string;
	originalName: string;
	name: string;
	reply: string;
	description: string;
	ephemeral: boolean;
	env: Env;
};

export const updateCommand = async ({
	guildId,
	originalName,
	name,
	reply,
	description,
	ephemeral,
	env,
}: UpdateCommandInput) => {
	await env.DB.prepare(
		"UPDATE commands SET name = ?, reply = ?, description = ?, ephemeral = ? WHERE guild_id = ? AND name = ?",
	)
		.bind(name, reply, description, ephemeral ? 1 : 0, guildId, originalName)
		.run();
};
