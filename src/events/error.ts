import { logger } from "@utils/logger";

module.exports = {
  name: "error",
  once: false,
  async execute(error: string) {
    logger.error(error);
  },
};
