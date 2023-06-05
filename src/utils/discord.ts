import { Client as DiscordClient, GatewayIntentBits } from "discord.js";

export const Client = new DiscordClient({
  intents: [GatewayIntentBits.Guilds],
});
