import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { logger } from "../utils/logger";
import { messages } from "../text/messages";
import { ConfigTypes } from "../utils/configTypes";

const config = require("../utils/config").getConfigs([
  ConfigTypes.COLOR,
  ConfigTypes.LOGO,
]);

// Handler for /slashy help
export const help = async (interaction: CommandInteraction): Promise<void> => {
  await interaction
    .editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Slashy Help")
          .setDescription(
            "You need some guidance on how to use Slashy? Click the button below to open the documentation."
          )
          .setThumbnail(config.LOGO)
          .setColor(config.COLOR)
          .setFooter({
            text: "Did you know that bots dream about horses? True fact.",
          }),
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
    })
    .catch(async (error) => {
      await interaction.editReply(error ?? messages.UnspecifiedError);
      logger.error(error);
    });
};
