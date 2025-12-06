import { readFileSync } from "node:fs";
import { basename } from "node:path";

type CommandRow = {
	id: string;
	guildId: string;
	name: string;
	reply: string;
	description: string;
	uses: string;
	ephemeral: string;
};

type GuildRow = {
	id: string;
	premium: string;
	banned: string;
	joinedAt: string;
	maxCommands: string;
	permission: string;
};

const escapeSql = (value: string) => value.replaceAll("'", "''");

const unescapeCopy = (value: string) =>
	value
		.replaceAll("\\N", "")
		.replaceAll("\\t", "\t")
		.replaceAll("\\r", "\r")
		.replaceAll("\\n", "\n")
		.replaceAll("\\\\", "\\");

const parseCopySection = <T extends Record<string, string>>(content: string, table: string, columns: string[]): T[] => {
	const start = `COPY public."${table}" (${columns.join(", ")}) FROM stdin;`;
	const idx = content.indexOf(start);
	if (idx === -1) return [];
	const after = content.slice(idx + start.length).trimStart();
	const lines = after.split("\n");
	const rows: T[] = [];
	for (const line of lines) {
		if (line === "\\.") break;
		const parts = line.split("\t").map(unescapeCopy);
		if (parts.length < columns.length) continue;
		const row: Record<string, string> = {};
		columns.forEach((col, i) => {
			row[col.replace(/"/g, "")] = parts[i] ?? "";
		});
		rows.push(row as T);
	}
	return rows;
};

const toCommandInsert = (row: CommandRow) => {
	const cols = ["id", "guild_id", "name", "reply", "description", "uses", "ephemeral"];
	const values = [
		row.id,
		row.guildId,
		row.name,
		row.reply.slice(0, 2000),
		row.description,
		row.uses,
		row.ephemeral === "t" ? "1" : "0",
	];
	const escaped = values.map((val, i) => (cols[i] === "uses" ? val : `'${escapeSql(val)}'`));
	return `INSERT OR REPLACE INTO commands (${cols.join(", ")}) VALUES (${escaped.join(", ")});`;
};

const toGuildInsert = (row: GuildRow) => {
	const cols = ["id", "premium", "banned", "joined_at", "max_commands", "permission"];
	const values = [
		row.id,
		row.premium === "t" ? "1" : "0",
		row.banned === "t" ? "1" : "0",
		row.joinedAt || "",
		row.maxCommands,
		row.permission,
	];
	const escaped = values.map((val, i) =>
		["premium", "banned", "max_commands"].includes(cols[i]) ? val : `'${escapeSql(val)}'`,
	);
	return `INSERT OR REPLACE INTO guilds (${cols.join(", ")}) VALUES (${escaped.join(", ")});`;
};

const main = () => {
	const inputPath = process.argv[2] ?? "backup.sql";
	const content = readFileSync(inputPath, "utf8");
	const commands = parseCopySection<CommandRow>(content, "Command", [
		"id",
		'"guildId"',
		"name",
		"reply",
		"description",
		"uses",
		"ephemeral",
	]);
	const guilds = parseCopySection<GuildRow>(content, "Guild", [
		"id",
		"premium",
		"banned",
		'"joinedAt"',
		'"maxCommands"',
		"permission",
	]);
	const lines: string[] = ["-- generated from", `-- ${basename(inputPath)}`];
	const wrapTx = !process.env.NO_TX;
	if (wrapTx) lines.push("BEGIN;");
	lines.push(...guilds.map(toGuildInsert));
	lines.push(...commands.map(toCommandInsert));
	if (wrapTx) lines.push("COMMIT;");
	lines.push("");
	process.stdout.write(lines.join("\n"));
};

main();
