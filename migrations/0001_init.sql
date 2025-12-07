CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  reply TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT 'A command made by Slashy.',
  ephemeral INTEGER NOT NULL DEFAULT 0,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (guild_id, name)
);

CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,
  banned INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  max_commands INTEGER NOT NULL DEFAULT 50,
);

