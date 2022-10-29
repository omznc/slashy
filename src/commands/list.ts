import { CommandInteraction, EmbedBuilder } from "discord.js";
import { GetGuildBanned, GetGuildCommands } from "../database/methods";
import { messages } from "../text/messages";
import { logger } from "../utils/logger";
import { ConfigTypes } from "../utils/configTypes";

const config = require("../utils/config").getConfigs([
  ConfigTypes.EXTRA_LOGGING,
  ConfigTypes.COLOR,
  ConfigTypes.LOGO,
]);

// Handler for /slashy list
export const list = async (interaction: CommandInteraction): Promise<void> => {
  await GetGuildBanned(interaction.guildId!)
    .then((isBanned) => {
      if (isBanned) return Promise.reject(messages.CommandGuildBannedError);
    })
    .then(async () => {
      await GetGuildCommands(interaction.guildId!).then(async (commands) => {
        if (commands.length === 0)
          return Promise.reject(messages.CommandListNoCommandsError);
        const commandsInfo: string[] = commands.map(
          (command) =>
            `\`/${command.name}\` (${command.uses} uses): ${command.description}`
        );

        for (let i = 0; i < commandsInfo.length; i += 30) {
          const embed = new EmbedBuilder()
            .setTitle(`${interaction.guild?.name}'s Commands`)
            .setThumbnail(config.LOGO)
            .setDescription(commandsInfo.slice(i, i + 30).join("\n"))
            .setColor(config.COLOR);

          if (i == 0) await interaction.editReply({ embeds: [embed] });
          else await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
      });
    })
    .catch(async (error) => {
      await interaction.editReply(error ?? messages.UnspecifiedError);
      logger.error(error);
    });
};
