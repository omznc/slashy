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
import { resolveLocale, t } from "./i18n";
import type { HandlerContext } from "./types";
import { jsonResponse } from "./utils/responses";

type InteractionRouteInput = {
	interaction: APIInteraction;
	context: HandlerContext;
	ctx: ExecutionContext;
};

type InteractionRoute = (input: InteractionRouteInput) => Promise<Response>;

type AutocompleteRouteInput = {
	interaction: APIApplicationCommandAutocompleteInteraction;
	context: HandlerContext;
	ctx: ExecutionContext;
};

type AutocompleteRoute = (input: AutocompleteRouteInput) => Promise<Response>;

type ApplicationCommandRouteInput = {
	interaction: APIApplicationCommandInteraction;
	context: HandlerContext;
	ctx: ExecutionContext;
};

type ApplicationCommandRoute = (input: ApplicationCommandRouteInput) => Promise<Response>;

const isApplicationCommandInteraction = (interaction: APIInteraction): interaction is APIApplicationCommandInteraction =>
	interaction.type === InteractionType.ApplicationCommand;

const isModalSubmitInteraction = (interaction: APIInteraction): interaction is APIModalSubmitInteraction =>
	interaction.type === InteractionType.ModalSubmit;

const isAutocompleteInteraction = (interaction: APIInteraction): interaction is APIApplicationCommandAutocompleteInteraction =>
	interaction.type === InteractionType.ApplicationCommandAutocomplete;

const routeAutocomplete: AutocompleteRoute = async ({ interaction, context }) => {
	if (interaction.data.name === "slashy") {
		ensureBaseCommand({ rest: context.rest, appId: context.env.DISCORD_APP_ID }).catch((error) => console.error("ensureBaseCommand", error));

		return handleSlashyAutocomplete({ interaction, context });
	}

	return jsonResponse({
		data: {
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: { choices: [] },
		},
	});
};

const routeApplicationCommand: ApplicationCommandRoute = async ({ interaction, context, ctx }) => {
	if (interaction.data.name === "slashy") {
		ensureBaseCommand({ rest: context.rest, appId: context.env.DISCORD_APP_ID }).catch((error) => console.error("ensureBaseCommand", error));

		return handleSlashy({ interaction, context, ctx });
	}

	return handleDynamic({ interaction, context, ctx });
};

export const routeInteraction: InteractionRoute = async ({ interaction, context, ctx }) => {
	if (interaction.type === InteractionType.Ping) return jsonResponse({ data: { type: InteractionResponseType.Pong } });

	if (isAutocompleteInteraction(interaction)) return routeAutocomplete({ interaction, context, ctx });
	if (isApplicationCommandInteraction(interaction)) return routeApplicationCommand({ interaction, context, ctx });
	if (isModalSubmitInteraction(interaction) && interaction.data.custom_id?.startsWith("slashy:")) return handleModal({ interaction, context, ctx });

	const locale = resolveLocale(interaction);

	return jsonResponse({
		data: {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: t(locale, "unsupportedInteraction"), flags: MessageFlags.Ephemeral },
		},
	});
};
