import { Client as DiscordClient, GatewayIntentBits } from "discord.js";

const Client = new DiscordClient({
  intents: [GatewayIntentBits.Guilds],
});

export default Client;
