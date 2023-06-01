import { Client } from "@utils/discordClient";
import { readdirSync } from "fs";
import { logger } from "@utils/logger";
import Cron from "croner";
import { ConfigTypes } from "@utils/types";

const { AutoPoster } = require("topgg-autoposter");
const path = require("path");

const config = require("@utils/configLoader").getConfigs([
  ConfigTypes.DISCORD_TOKEN,
  ConfigTypes.DISCORD_CLIENT_ID,
  ConfigTypes.TOPGG_TOKEN,
  ConfigTypes.EXTRA_LOGGING,
]);

if (config.DISCORD_TOKEN === undefined)
  throw new Error("No Discord Token provided.");
if (config.DISCORD_CLIENT_ID === undefined)
  throw new Error("No Discord Client ID provided.");

export const tasks: { name: string; job: Cron }[] = [];

// Event Handler
for (const file of readdirSync(path.resolve(__dirname, "./events")).filter(
  (fileName) => fileName.endsWith(".js")
)) {
  const event = require(`./events/${file}`);
  if (event.once) Client.once(event.name, (...args) => event.execute(...args));
  else Client.on(event.name, (...args) => event.execute(...args));
}

// Task Handler
for (const file of readdirSync(path.resolve(__dirname, "./tasks")).filter(
  (fileName) => fileName.endsWith(".js")
)) {
  const task = require(`./tasks/${file}`);
  tasks.push({
    name: task.name,
    job: Cron(task.frequency, () => task.execute()),
  });
}

// Top.gg listing status handler
if (config.TOPGG_TOKEN) {
  interface TopGgStats {
    serverCount: string;
    shardCount: number;
    shardId: string;
  }

  const poster = AutoPoster(config.TOPGG_TOKEN, Client);
  if (config.EXTRA_LOGGING) {
    poster.on("posted", (stats: TopGgStats) =>
      logger.info(`Updated 'top.gg' listing | ${stats.serverCount} servers.`)
    );
    poster.on("error", () =>
      logger.error("The 'top.gg' listing update failed.")
    );
  }
} else
  logger.info(
    "No Top.gg token provided, skipping Top.gg listing status handler."
  );

Client.login(config.DISCORD_TOKEN).catch((err) => {
  logger.error(err);
});

process.on("unhandledRejection", (err) => {
  logger.error(err);
});
