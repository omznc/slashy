/**
 * Validates the command name.
 * @param {string} name The command name.
 * @returns {boolean} Whether the command name is valid.
 */
export const isValidCommandName = (name: string): boolean => !(name == 'slashy' || name.length < 3 || name.length > 32 || !/^[\P{Lu}\p{N}_-]+$/u.test(name));

/**
 * Validates the command reply.
 * @param {string} reply The command reply.
 * @returns {boolean} Whether the command reply is valid.
 */
export const isValidReply = (reply: string): boolean => reply.length <= 2000;

/**
 * Validates the command description.
 * @param {string} description The command description.
 * @returns {boolean} Whether the command description is valid.
 */
export const isValidDescription = (description: string): boolean => !(description.length < 1 || description.length > 100);
