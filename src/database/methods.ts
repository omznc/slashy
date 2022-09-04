// noinspection JSUnusedGlobalSymbols

import prisma from '.';
import { Command, Guild } from '@prisma/client';
import { cache } from './cache';

/**
 * Gets the number of all commands in all servers
 * @returns {Promise<number>} The number of commands in all servers
 */
export const GetTotalCommandsInAllServers = async (): Promise<number> => prisma.command.count();

/**
 * Gets the sum of all uses of all commands in all guilds
 * @returns {Promise<number>} The sum of all uses of all commands in all guilds
 */
export const GetTotalCommandsRunInAllServers = async (): Promise<number> => {
	return prisma.command.aggregate({
			_sum: {
				uses: true
			}
		})
		.then((result) => {
			return result._sum.uses ?? 0;
		})
};

/**
 * Removes all guilds that's ID isn't in the provided list
 * @param {string[]} whitelistedGuilds The list of guild IDs to keep
 */
export const RemoveLeftGuilds = async (whitelistedGuilds: string[]): Promise<void> => {
	await prisma.guild.deleteMany({
			where: {
				id: {
					notIn: whitelistedGuilds
				}
			}
		}
	);
}

/**
 * Gets all commands in a guild
 * @param {string} guildId The ID of the guild to get the commands from
 * @returns {Promise<Command[]>} The commands in the guild
 */
export const FetchGuildAndCommands = async (guildId: string): Promise<(Guild & { commands: Command[] })> => {
	return prisma.guild.findFirst({
			where: {
				id: guildId,
			},
			include: {
				commands: true,
			},
		})
		.then(async result => {
			if (!result) {
				return prisma.guild.create({
					data: {
						id: guildId,
					},
					include: {
						commands: true,
					},
				});
			}
			return result;
		})
};

/**
 * Gets a guild command. Uses cache.
 * @param {string} guildId The ID of the guild to get the commands from
 * @param {string} name The name of the command to get
 * @returns {Promise<Command>} The command
 */
export const GetGuildCommand = async (guildId: string, name: string): Promise<Command> => {
	const command = await GetGuildAndCommands(guildId).then(guild => guild.commands.find(c => c.name === name)!);
	await IncrementCommandUses(command);
	return command;
};

/**
 * Checks if a command exists in a guild
 * @param {string} guildId The ID of the guild to check the command in
 * @param {string} name The name of the command to check
 * @returns {Promise<boolean>} Whether the command exists
 */
export const DoesCommandExist = async (guildId: string, name: string): Promise<boolean> => {
	const command = await GetGuildAndCommands(guildId).then(guild => guild.commands.find(c => c.name === name));
	return command !== undefined;
};

/**
 * Increments the uses of a command
 * @param {Command} command The command to increment the uses of
 */
export const IncrementCommandUses = async (command: Command): Promise<void> => {
	await prisma.command.update({
		where: {
			id: command.id,
		},
		data: {
			uses: command.uses + 1,
		},
	});
	// Do it in the cache too
	GetGuildAndCommands(command.guildId).then(guild => {
		const index = guild.commands.findIndex(c => c.id === command.id);
		guild.commands[index].uses++;
	});
};

/**
 * Returns all commands for a guild, sorted by usage.
 * @param {string} guildId The ID of the guild to get the commands from
 * @returns {Promise<Command[]>} The commands
 */
export const GetGuildCommands = async (guildId: string): Promise<Command[]> => {
	return GetGuildAndCommands(guildId).then(guild => {
		return [ ...guild.commands ].sort((a, b) => b.uses - a.uses);
	});
};

/**
 * Returns max commands and current commands for a guild.
 * @param {string} guildId The ID of the guild to get the commands from
 * @returns {Promise<{ max: number, current: number }>} The max and current commands
 */
export const GetGuildCommandLimitInfo = async (guildId: string): Promise<[ number, number ]> => {
	return GetGuildAndCommands(guildId).then(guild => [ guild.maxCommands, guild.commands.length ]);
};

/**
 * Returns the Role ID for the permission required to manage commands.
 * @param {string} guildId The ID of the guild to get the commands from
 * @returns {Promise<string>} The Role ID
 */
export const GetGuildPermission = async (guildId: string): Promise<string> => {
	return GetGuildAndCommands(guildId).then(guild => guild.permission);
};

/**
 * Sets a new permission for the guild.
 * @param {string} guildId The ID of the guild to set the permission for
 * @param {string} roleId The ID of the role to set the permission to
 */
export const SetGuildPermission = async (guildId: string, roleId: string): Promise<void> => {
	await Promise.all(
		[
			prisma.guild.update({
				where: {
					id: guildId,
				},
				data: {
					permission: roleId,
				},
			}),
			GetGuildAndCommands(guildId).then(guild => guild.permission = roleId)
		]
	);
};

/**
 * Returns the guild and its commands.
 * @param {string} guildId The ID of the guild to get
 * @returns {Promise<(Guild & { commands: Command[] })>} The guild and its commands
 */
export const GetGuildAndCommands = async (guildId: string): Promise<(Guild & { commands: Command[] })> => {
	const cachedGuild = cache.get(guildId);
	if (cachedGuild) return cachedGuild

	return FetchGuildAndCommands(guildId)
		.then((guild) => {
			cache.set(guildId, guild);
			return guild;
		})
};

/**
 * Removes a list of guilds. If banned, removes only commands.
 * @param {string[]} guildIds The guilds to remove
 */
export const RemoveGuilds = async (guildIds: string[]): Promise<void> => {
	await Promise.all([
		await prisma.guild.deleteMany({
			where: {
				id: {
					in: guildIds,
				},
				banned: false,
				premium: false,
			},
		}),
		await prisma.command.deleteMany({
			where: {
				guild: {
					id: {
						in: guildIds,
					},
					banned: true,
				},
			},
		}),
		await prisma.command.deleteMany({
			where: {
				guild: {
					id: {
						in: guildIds,
					},
					premium: true,
				},
			},
		})
	]);
	for (const guildId of guildIds) cache.remove(guildId);
};

/**
 * Deletes a guild command from the database, returns the command ID.
 * @param {string} guildId The ID of the guild to delete the command from
 * @param {string} name The name of the command to delete
 * @returns {Promise<string | null>} The command ID if it exists, null otherwise
 */
export const RemoveGuildCommand = async (guildId: string, name: string): Promise<string | null> => {
	return GetGuildCommand(guildId, name)
		.then(async command => {
			if (!command) return null;
			await prisma.command.delete({
				where: {
					id: command.id,
				},
			});
			const guildCommands = cache.get(guildId)?.commands;
			if (guildCommands) {
				let index = guildCommands.findIndex((c: Command) => c.name === name);
				if (index !== -1) guildCommands.splice(index, 1);
			}
			return command.id;
		})
};

/**
 * Adds a guild command to the database.
 * @param {string} guildId The ID of the guild to add the command to
 * @param {string} id The ID of the command
 * @param {string} name The name of the command
 * @param {string} reply The reply to send when the command is used
 * @param {string | undefined} description The description of the command
 * @param {boolean} ephemeral Whether the command is ephemeral
 */
export const AddGuildCommand = async (
	guildId: string,
	id: string,
	name: string,
	reply: string,
	description: string | undefined,
	ephemeral: boolean
): Promise<void> => {
	await GetGuildAndCommands(guildId)
		.then(async guild => {
			if (guild.banned) return;
			await prisma.command.create({
				data: {
					id,
					name,
					reply,
					description,
					ephemeral,
					guild: {
						connect: {
							id: guild.id,
						},
					},
				},
			}).then(command => cache.get(guild.id)!.commands.push(command));
		})
};

/**
 * Edits a guild command in the database.
 * @param {string} guildId The ID of the guild to edit the command in
 * @param {string} name The name of the command to edit
 * @param {string | undefined} reply The reply to send when the command is used
 * @param {string | undefined} description The description of the command
 * @param {boolean | undefined} ephemeral Whether the command is ephemeral
 * @returns {Promise<Command>} The edited command
 */
export const EditGuildCommand = async (
	guildId: string,
	name: string,
	reply?: string,
	description?: string,
	ephemeral?: boolean
): Promise<Command> => {
	return GetGuildCommand(guildId, name)
		.then(async command => {
			command = await prisma.command.update({
				where: {
					id: command.id,
				},
				data: {
					reply: reply ?? command.reply,
					description: description ?? command.description,
					ephemeral: ephemeral ?? command.ephemeral,
				},
			});
			let guildCommands = cache.get(guildId)!.commands;
			guildCommands[guildCommands.findIndex((c: Command) => c.id === command.id)] = command!;
			return command;
		})
};

/**
 * Checks if a guild is banned from using the bot
 * @param {string} guildId The ID of the guild to check
 * @returns {Promise<boolean>} Whether the guild is banned
 */
export const GetGuildBanned = async (guildId: string): Promise<boolean> => {
	return GetGuildAndCommands(guildId).then(guild => guild?.banned ?? false)
};


//// UNUSED FUNCTIONS THAT WILL BE USED LATER ////

/**
 * Sets the banned guild attribute
 * @param {string} guildId The ID of the guild to set
 * @param {boolean} banned Whether the guild is banned
 */
export const SetGuildBanned = async (guildId: string, banned: boolean): Promise<void> => {
	await GetGuildAndCommands(guildId)
		.then(async guild => {
			await prisma.guild.update({
				where: {
					id: guild.id,
				},
				data: {
					banned,
				},
			});
			cache.get(guild.id)!.banned = banned;
		})
};

/**
 * Returns the premium status of a guild.
 * @param {string} guildId The ID of the guild.
 * @returns {Promise<boolean>} Whether the guild is premium.
 */
export const GetGuildPremium = async (guildId: string): Promise<boolean> => GetGuildAndCommands(guildId).then(guild => guild?.premium ?? false);

/**
 * Sets the premium guild attribute of a guild.
 * @param {string} guildId The ID of the guild.
 * @param {boolean} premium Whether the guild is premium.
 */
export const SetGuildPremium = async (guildId: string, premium: boolean): Promise<void> => {
	await GetGuildAndCommands(guildId)
		.then(async guild => {
			await prisma.guild.update({
				where: {
					id: guild.id,
				},
				data: {
					premium,
				},
			});
			cache.get(guild.id)!.premium = premium;
		})
};

