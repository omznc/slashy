import { CommandInteraction } from "discord.js";
import {
  DoesCommandExist,
  EditGuildCommand,
  GetGuildBanned,
} from "../database/methods";
import { EditGuildCommandAPI } from "../utils/commands-api";
import { isValidDescription, isValidReply } from "../utils/helpers";
import { messages } from "../text/messages";
import { Command } from "@prisma/client";
import { logger } from "../utils/logger";
import { ConfigTypes } from "../utils/configTypes";

const config = require("../utils/config").getConfigs([
  ConfigTypes.EXTRA_LOGGING,
]);

// Handler for /slashy edit <name:str> [reply:str] [description:str] [ephemeral:bool]
export const edit = async (
  interaction: CommandInteraction,
  options: Map<string, any>,
): Promise<void> => {
  await GetGuildBanned(interaction.guildId!)
    .then((isBanned) => {
      if (isBanned) return Promise.reject(messages.CommandGuildBannedError);
    })
    .then(async () => {
      // Check if the command exists
      const name: string = options.get("name");
      if (!(await DoesCommandExist(interaction.guildId!, name)))
        return Promise.reject(messages.CommandDoesNotExist);

      // Reply Validation
      const reply: string | undefined = options.get("reply");
      if (reply != undefined && !isValidReply(reply))
        return Promise.reject(messages.CommandReplyInvalidError);

      // Description Validation
      const description: string | undefined = options.get("description");
      if (description != undefined && !isValidDescription(description))
        return Promise.reject(messages.CommandDescriptionInvalidError);

      const ephemeral: boolean | undefined = options.get("ephemeral");

      if (
        reply == undefined &&
        description == undefined &&
        ephemeral == undefined
      )
        return Promise.reject(messages.CommandOptionEditNoArguments);
      // All validations passed, edit the command
      else
        await EditGuildCommand(
          interaction.guildId!,
          name,
          reply,
          description,
          ephemeral,
        ).then(async (command: Command) => {
          await EditGuildCommandAPI(
            interaction.guildId!,
            command.id,
            command.description,
            command.ephemeral,
          )
            .then(async () => {
              await interaction.editReply(messages.CommandEdited);
              if (config.EXTRA_LOGGING)
                logger.info(
                  `[COMMAND] Edited ${name} in guild ${interaction.guildId}`,
                );
            })
            .catch(async (error: Error) => {
              logger.error(error);
              return Promise.reject(messages.UnspecifiedError);
            });
        });
    })
    .catch(async (error) => {
      await interaction.editReply(error ?? messages.UnspecifiedError);
      logger.error(error);
    });
};
