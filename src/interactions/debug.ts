import type { APIInteraction, InteractionType } from "discord-api-types/v10";

type InteractionDataShape = {
	name?: unknown;
	custom_id?: unknown;
};

export type InteractionDebug = {
	type: InteractionType;
	name?: string;
	customId?: string;
};

const extractInteractionData = (interaction: APIInteraction): InteractionDataShape | undefined => {
	if ("data" in interaction && interaction.data && typeof interaction.data === "object") {
		return interaction.data as InteractionDataShape;
	}

	return undefined;
};

export const getInteractionDebug = (interaction: APIInteraction): InteractionDebug => {
	const data = extractInteractionData(interaction);

	return {
		type: interaction.type,
		name: typeof data?.name === "string" ? data.name : undefined,
		customId: typeof data?.custom_id === "string" ? data.custom_id : undefined,
	};
};

export const logInteractionDebug = (interaction: APIInteraction) => {
	try {
		console.log("interaction", getInteractionDebug(interaction));
	} catch {}
};
