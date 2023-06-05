import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
} from "discord.js";
import { logger } from "../utils/logger";
import { ConfigTypes } from "../utils/configTypes";

const config = require("../utils/config").getConfigs([
  ConfigTypes.EXTRA_LOGGING,
]);

module.exports = {
  name: "guildCreate",
  once: false,
  async execute(guild: Guild) {
    if (config.EXTRA_LOGGING)
      logger.info(`[GUILD] Joined ${guild.name} (${guild.id})`);

    await guild
      .fetchOwner()
      .then(async (owner) => {
        const content = {
          embeds: [
            new EmbedBuilder()
              .setTitle(`Welcome to Slashy, **${guild.name}** 👋`)
              .setDescription(
                "Thanks for letting me be a part of your community! You can run `/slashy help` anywhere to get a list of commands and how to use them, but here's a quickstart guide just in case."
              )
              .setFooter({
                text: "If you need any help, you can always run /slashy help, or join the support server.",
              })
              .addFields([
                {
                  name: "How to add a command?",
                  value:
                    "Run `/slashy add` and provide it the inputs it needs to create your command.",
                },
                {
                  name: "How to run a command?",
                  value:
                    "Just do / and your command's name. It's available instantly as soon as you create it.",
                },
                {
                  name: "How do I setup permissions?",
                  value:
                    "This is incredibly easy to do. By default, only the server owner can use Slashy's add, remove, edit & config commands. You can use `/slashy config [role]` with any new or existing role to use that as a required role to modify custom commands in your server.\nOnly the server owner can run this command - that's you!\n__All users can run custom commands.__",
                },
              ]),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents([
              new ButtonBuilder()
                .setURL("https://hey.imkez.com/slashy-vote")
                .setLabel("Vote for me")
                .setEmoji("⭐")
                .setStyle(ButtonStyle.Link),
              new ButtonBuilder()
                .setURL("https://discord.gg/GeYMk6f9hC")
                .setLabel("Support Server")
                .setEmoji("🌐")
                .setStyle(ButtonStyle.Link),
              new ButtonBuilder()
                .setURL("https://hey.imkez.com/slashy-documentation")
                .setLabel("Documentation")
                .setEmoji("📖")
                .setStyle(ButtonStyle.Link),
            ]),
          ],
        };
        await Promise.all([
          owner.send(content),
          guild.systemChannel?.send(content),
        ]);
      })
      .catch((error) => logger.error(error));
  },
};
