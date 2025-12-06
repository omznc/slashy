import type {
	APIApplicationCommandInteraction,
	APIModalComponent,
	APIModalSubmitInteraction,
	APISelectMenuComponent,
} from "discord-api-types/v10";

type VisibilityParseResult = boolean | undefined;

type ModalComponentRow = APIModalSubmitInteraction["data"]["components"][number];
type ModalChildComponent = APIModalComponent | APISelectMenuComponent;
type ModalComponentEntry = ModalComponentRow | ModalChildComponent;

type ComponentWrapper = {
	component?: ModalComponentEntry;
};

type ComponentValue = {
	id: string;
	value: string;
};

const isComponentWrapper = (row: ModalComponentRow | ComponentWrapper): row is ComponentWrapper =>
	typeof (row as ComponentWrapper).component === "object" && (row as ComponentWrapper).component !== null;

const extractComponentValue = (component: ModalComponentEntry): ComponentValue | null => {
	if (!("custom_id" in component) || typeof component.custom_id !== "string") return null;
	if ("values" in component && Array.isArray(component.values) && typeof component.values[0] === "string") {
		return { id: component.custom_id, value: component.values[0] };
	}
	if ("value" in component && typeof component.value === "string") {
		return { id: component.custom_id, value: component.value };
	}
	return null;
};

const flattenRowComponents = (row: ModalComponentRow): ModalComponentEntry[] => {
	if ("components" in row && Array.isArray(row.components)) return row.components as ModalComponentEntry[];
	if (isComponentWrapper(row)) return row.component ? [row.component] : [];
	return [row];
};

export const sanitizeName = (name: string) => {
	const valid = /^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;
	const normalized = name
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]/gu, "-");
	const collapsed = normalized.replace(/([-_])\1+/g, "$1");
	const trimmed = collapsed.replace(/^[-_]+|[-_]+$/g, "");
	const limited = trimmed.slice(0, 32);
	if (!limited.length) return "";
	return valid.test(limited) ? limited : "";
};

export const hasManageGuild = (memberPermissions: string | undefined) => {
	if (!memberPermissions) return false;
	return (BigInt(memberPermissions) & 0x20n) === 0x20n;
};

export const parseVisibility = (value: string | undefined): VisibilityParseResult => {
	if (!value) return false;
	const normalized = value.trim().toLowerCase();
	if (["public", "pub"].includes(normalized)) return false;
	if (["ephemeral", "eph", "private", "yes", "y", "true", "1", "on"].includes(normalized)) return true;
	if (["no", "n", "false", "0", "off"].includes(normalized)) return false;
	return undefined;
};

export const collectFields = (interaction: APIModalSubmitInteraction) => {
	const entries: Record<string, string> = {};
	for (const row of interaction.data.components) {
		for (const component of flattenRowComponents(row)) {
			const pair = extractComponentValue(component);
			if (pair) entries[pair.id] = pair.value;
		}
	}
	return entries;
};

export const formatReply = (template: string, interaction: APIApplicationCommandInteraction) => {
	const userId = interaction.member?.user.id ?? interaction.user?.id ?? "";
	const username = interaction.member?.user.username ?? interaction.user?.username ?? "user";
	const avatar =
		interaction.member?.user.avatar || interaction.user?.avatar
			? `https://cdn.discordapp.com/avatars/${userId}/${interaction.member?.user.avatar ?? interaction.user?.avatar}.png`
			: "";
	return template
		.replaceAll("[[user]]", userId ? `<@${userId}>` : username)
		.replaceAll("[[user.name]]", username)
		.replaceAll("[[user.avatar]]", avatar);
};
