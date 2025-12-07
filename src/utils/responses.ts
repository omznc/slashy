import type { REST } from "@discordjs/rest";
import { InteractionResponseType, MessageFlags, Routes } from "discord-api-types/v10";

export type JsonInit = number | ResponseInit;

export type JsonResponseInput = {
	data: unknown;
	init?: JsonInit;
};

export const jsonResponse = ({ data, init = 200 }: JsonResponseInput) => {
	const status = typeof init === "number" ? init : (init.status ?? 200);

	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json",
			...(typeof init === "object" && init.headers ? init.headers : {}),
		},
	});
};

export const deferredResponse = (ephemeral = false) =>
	jsonResponse({
		data: {
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
		},
	});

export type EditInteractionInput = {
	appId: string;
	token: string;
	content: string;
	flags?: number;
	rest: REST;
};

export const editInteractionResponse = async ({ appId, token, content, flags, rest }: EditInteractionInput) => {
	await rest.patch(Routes.webhookMessage(appId, token, "@original"), {
		body: { content, flags },
	});
};
