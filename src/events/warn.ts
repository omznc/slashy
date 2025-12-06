import { logger } from "../utils/logger";

module.exports = {
  name: "warn",
  once: false,
  async execute(warning: string) {
    logger.warn(warning);
  },
};
