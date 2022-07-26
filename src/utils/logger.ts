const pino = require('pino');
export const logger = pino(pino.destination({ sync: false }));
