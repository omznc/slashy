import {
	type APIApplicationCommandAutocompleteInteraction,
	type APIApplicationCommandInteraction,
	type APIInteraction,
	type APIModalSubmitInteraction,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
} from "discord-api-types/v10";
import { ensureBaseCommand } from "./discord/registration";
import { handleDynamic } from "./handlers/dynamic";
import { handleModal } from "./handlers/modal";
import { handleSlashy, handleSlashyAutocomplete } from "./handlers/slashy";
import type { HandlerContext } from "./types";
import { jsonResponse } from "./utils/responses";

type InteractionRoute = (interaction: APIInteraction, context: HandlerContext) => Promise<Response>;

type AutocompleteRoute = (
	interaction: APIApplicationCommandAutocompleteInteraction,
	context: HandlerContext,
) => Promise<Response>;

type ApplicationCommandRoute = (
	interaction: APIApplicationCommandInteraction,
	context: HandlerContext,
) => Promise<Response>;

const isApplicationCommandInteraction = (
	interaction: APIInteraction,
): interaction is APIApplicationCommandInteraction => interaction.type === InteractionType.ApplicationCommand;

const isModalSubmitInteraction = (interaction: APIInteraction): interaction is APIModalSubmitInteraction =>
	interaction.type === InteractionType.ModalSubmit;

const isAutocompleteInteraction = (
	interaction: APIInteraction,
): interaction is APIApplicationCommandAutocompleteInteraction =>
	interaction.type === InteractionType.ApplicationCommandAutocomplete;

const routeAutocomplete: AutocompleteRoute = async (interaction, context) => {
	if (interaction.data.name === "slashy") {
		ensureBaseCommand({ rest: context.rest, appId: context.env.DISCORD_APP_ID }).catch((error) =>
			console.error("ensureBaseCommand", error),
		);

		return handleSlashyAutocomplete(interaction, context);
	}

	return jsonResponse({
		type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		data: { choices: [] },
	});
};

const routeApplicationCommand: ApplicationCommandRoute = async (interaction, context) => {
	if (interaction.data.name === "slashy") {
		ensureBaseCommand({ rest: context.rest, appId: context.env.DISCORD_APP_ID }).catch((error) =>
			console.error("ensureBaseCommand", error),
		);

		return handleSlashy(interaction, context);
	}

	return handleDynamic(interaction, context);
};

export const routeInteraction: InteractionRoute = async (interaction, context) => {
	if (interaction.type === InteractionType.Ping) return jsonResponse({ type: InteractionResponseType.Pong });

	if (isAutocompleteInteraction(interaction)) return routeAutocomplete(interaction, context);
	if (isApplicationCommandInteraction(interaction)) return routeApplicationCommand(interaction, context);
	if (isModalSubmitInteraction(interaction) && interaction.data.custom_id === "slashy:add")
		return handleModal(interaction, context);

	return jsonResponse({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: { content: "Unsupported interaction.", flags: MessageFlags.Ephemeral },
	});
};
