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

type PlaceholderContext = {
	interaction: APIApplicationCommandInteraction;
	locale: string;
	localeParts: {
		language: string;
		region: string;
	};
	replacements: Record<string, string>;
};

const emojiSets: Record<string, string[]> = {
	default: ["😀", "😅", "😎", "🤔", "😴", "🤖", "🔥", "🎉", "🚀", "✨"],
	party: ["🎉", "🥳", "🎊", "🍾", "🎂", "🪩", "🎈", "🕺", "💃", "✨"],
	faces: ["😀", "😅", "😂", "😊", "😍", "🤔", "😴", "😭", "😡", "🤯"],
};

const randomInt = (min: number, max: number) => {
	const a = Math.min(min, max);
	const b = Math.max(min, max);
	const span = b - a + 1;
	return a + Math.floor(Math.random() * span);
};

const pickRandom = (items: string[]) => {
	if (!items.length) return "";
	return items[randomInt(0, items.length - 1)];
};

const weightedRandom = (pairs: Array<{ value: string; weight: number }>) => {
	const total = pairs.reduce((acc, pair) => acc + (Number.isFinite(pair.weight) ? pair.weight : 0), 0);
	if (!total) return "";
	let roll = Math.random() * total;
	for (const pair of pairs) {
		const w = Number.isFinite(pair.weight) ? pair.weight : 0;
		if (roll < w) return pair.value;
		roll -= w;
	}
	return pairs.at(-1)?.value ?? "";
};

const generateShortId = () => Math.random().toString(36).slice(2, 10);

const toTitleCase = (value: string) =>
	value
		.split(/\s+/)
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
		.join(" ")
		.trim();

const booleanLike = (value: string) => {
	const normalized = value.trim().toLowerCase();
	if (!normalized) return false;
	if (["0", "false", "no", "off", "nil", "null", "undefined"].includes(normalized)) return false;
	return true;
};

const twoDigits = (value: number) => value.toString().padStart(2, "0");

const formatDateWithPattern = (date: Date, pattern: string, locale: string, timeZone?: string) => {
	if (pattern === "locale-default") return date.toLocaleString(locale || undefined, { timeZone });

	const names = new Intl.DateTimeFormat(locale || undefined, {
		timeZone,
		weekday: "long",
		month: "long",
	})
		.formatToParts(date)
		.reduce<Record<string, string>>((acc, part) => {
			if (part.type === "weekday") acc.weekday = part.value;
			if (part.type === "month") acc.month = part.value;
			return acc;
		}, {});

	const shortNames = new Intl.DateTimeFormat(locale || undefined, {
		timeZone,
		weekday: "short",
		month: "short",
	})
		.formatToParts(date)
		.reduce<Record<string, string>>((acc, part) => {
			if (part.type === "weekday") acc.weekday = part.value;
			if (part.type === "month") acc.month = part.value;
			return acc;
		}, {});

	const hour = date.toLocaleString(locale || undefined, { timeZone, hour: "numeric", hour12: true });
	const period = hour.toLowerCase().includes("pm") ? "PM" : "AM";
	const hourNumber = date.toLocaleString(locale || undefined, { timeZone, hour: "numeric", hour12: true });
	const hourValue = Number.parseInt(hourNumber, 10);

	const parts: Record<string, string> = {
		"%Y": date.getFullYear().toString(),
		"%y": twoDigits(date.getFullYear() % 100),
		"%m": twoDigits(date.getMonth() + 1),
		"%d": twoDigits(date.getDate()),
		"%H": twoDigits(date.getHours()),
		"%M": twoDigits(date.getMinutes()),
		"%S": twoDigits(date.getSeconds()),
		"%I": twoDigits(Number.isNaN(hourValue) ? date.getHours() : hourValue),
		"%p": period,
		"%b": shortNames.month ?? "",
		"%B": names.month ?? "",
		"%a": shortNames.weekday ?? "",
		"%A": names.weekday ?? "",
		"%Z":
			new Intl.DateTimeFormat(locale || undefined, {
				timeZone,
				timeZoneName: "short",
			})
				.formatToParts(date)
				.find((part) => part.type === "timeZoneName")?.value ?? "",
	};

	return pattern.replace(/%[YymdHMSIpaAbBZ]/g, (match) => parts[match] ?? match);
};

const formatRelativeNow = (date: Date, locale: string) => {
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	const rtf = new Intl.RelativeTimeFormat(locale || undefined, { numeric: "auto" });
	return rtf.format(diffSeconds, "second");
};

const discordTimestampTag = (date: Date, style?: string) => {
	const unix = Math.floor(date.getTime() / 1000);
	const allowed = new Set(["t", "T", "d", "D", "f", "F", "R"]);
	if (!style || !allowed.has(style)) return `<t:${unix}>`;
	return `<t:${unix}:${style}>`;
};

const evaluateMath = (expression: string) => {
	const allowed = /^[0-9+\-*/%().,\sA-Za-z_]+$/;
	if (!allowed.test(expression)) return "";

	const replacements: Record<string, string> = {
		PI: "Math.PI",
		E: "Math.E",
	};

	const funcs = [
		"abs",
		"ceil",
		"floor",
		"round",
		"trunc",
		"sign",
		"sqrt",
		"cbrt",
		"pow",
		"exp",
		"log",
		"min",
		"max",
		"sin",
		"cos",
		"tan",
		"asin",
		"acos",
		"atan",
		"atan2",
	];

	let expr = expression;

	for (const key of Object.keys(replacements)) {
		const regex = new RegExp(`\\b${key}\\b`, "g");
		expr = expr.replace(regex, replacements[key]);
	}

	for (const fn of funcs) {
		const regex = new RegExp(`\\b${fn}\\b`, "g");
		expr = expr.replace(regex, `Math.${fn}`);
	}

	try {
		const result = Function(`"use strict"; return (${expr});`)();
		if (typeof result === "number" && Number.isFinite(result)) return result.toString();
		return "";
	} catch {
		return "";
	}
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

export type FormatReplyInput = {
	template: string;
	interaction: APIApplicationCommandInteraction;
};

const buildContext = (interaction: APIApplicationCommandInteraction): PlaceholderContext => {
	const userId = interaction.member?.user.id ?? interaction.user?.id ?? "";
	const username = interaction.member?.user.username ?? interaction.user?.username ?? "user";
	const globalName = interaction.member?.user.global_name ?? interaction.user?.global_name ?? "";
	const nickname = interaction.member?.nick ?? "";
	const displayName = nickname || globalName || username;

	const avatar =
		interaction.member?.user.avatar || interaction.user?.avatar
			? `https://cdn.discordapp.com/avatars/${userId}/${interaction.member?.user.avatar ?? interaction.user?.avatar}.png`
			: "";

	const channelId = interaction.channel?.id ?? interaction.channel_id ?? "";
	const guildId = interaction.guild_id ?? "";
	const locale = interaction.locale ?? interaction.guild_locale ?? "";
	const commandName = interaction.data.name ?? "";

	const replacements: Record<string, string> = {
		"[[user]]": userId ? `<@${userId}>` : username,
		"[[user.mention]]": userId ? `<@${userId}>` : username,
		"[[user.id]]": userId,
		"[[user.name]]": username,
		"[[user.username]]": username,
		"[[user.global_name]]": globalName,
		"[[user.nickname]]": nickname,
		"[[user.display]]": displayName,
		"[[user.display_name]]": displayName,
		"[[user.avatar]]": avatar,
		"[[channel.id]]": channelId,
		"[[channel.mention]]": channelId ? `<#${channelId}>` : "",
		"[[server.id]]": guildId,
		"[[locale]]": locale,
		"[[locale.name]]": locale.split(/[-_]/)[0] ?? "",
		"[[locale.region]]": locale.split(/[-_]/)[1] ?? "",
		"[[command.name]]": commandName,
	};

	const localeParts = {
		language: locale.split(/[-_]/)[0] ?? "",
		region: locale.split(/[-_]/)[1] ?? "",
	};

	return { interaction, locale, localeParts, replacements };
};

const applyPlaceholders = async (value: string, context: PlaceholderContext, depth = 0): Promise<string> => {
	if (depth > 3) return value;

	let output = value;

	for (const [placeholder, replacement] of Object.entries(context.replacements)) {
		output = output.replaceAll(placeholder, replacement);
	}

	const pattern = /\[\[([^\]]+)\]\]/g;
	const matches = [...output.matchAll(pattern)];
	let cursor = 0;
	let result = "";

	for (const match of matches) {
		if (match.index === undefined) continue;
		result += output.slice(cursor, match.index);
		const token = match[1];
		const resolved = await resolvePlaceholder(token, context, depth);
		result += resolved;
		cursor = match.index + match[0].length;
	}

	result += output.slice(cursor);

	return result;
};

const resolvePlaceholder = async (token: string, context: PlaceholderContext, depth: number): Promise<string> => {
	if (token in context.replacements) return context.replacements[token];

	if (token === "random") return randomInt(1, 100).toString();

	if (token.startsWith("random:")) {
		const parts = token.split(":").slice(1).filter(Boolean);
		const nums = parts.map((part) => Number.parseInt(part, 10)).filter((num) => Number.isFinite(num));
		if (nums.length === 1) return randomInt(1, nums[0]).toString();
		if (nums.length >= 2) return randomInt(nums[0], nums[1]).toString();
	}

	if (token.startsWith("rand.pick:")) {
		const list = token
			.slice("rand.pick:".length)
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
		return pickRandom(list);
	}

	if (token.startsWith("rand.weighted:")) {
		const entries = token
			.slice("rand.weighted:".length)
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);

		const pairs = entries
			.map((entry) => {
				const [value, weightRaw] = entry.split("=");
				const weight = Number.parseFloat(weightRaw ?? "");
				return { value, weight: Number.isFinite(weight) ? weight : 0 };
			})
			.filter((pair) => pair.value);

		return weightedRandom(pairs);
	}

	if (token === "uuid") return crypto.randomUUID ? crypto.randomUUID() : generateShortId();
	if (token === "shortid") return generateShortId();

	if (token === "now") return new Date().toISOString();

	if (token.startsWith("now:")) {
		const payload = token.slice(4);
		const date = new Date();

		if (payload === "unix") return Math.floor(date.getTime() / 1000).toString();
		if (payload === "tag") return discordTimestampTag(date);
		if (payload.startsWith("tag:")) return discordTimestampTag(date, payload.slice(4));
		if (payload === "rel") return formatRelativeNow(date, context.locale);
		if (payload.startsWith("fmt:")) {
			const pattern = payload.slice(4) || "%Y-%m-%dT%H:%M:%S";
			return formatDateWithPattern(date, pattern, context.locale);
		}
		if (payload.startsWith("tz:")) {
			const afterTz = payload.slice(3);
			const [tz, ...rest] = afterTz.split(":");
			const joined = rest.join(":");
			if (!rest.length) return formatDateWithPattern(date, "%Y-%m-%dT%H:%M:%S", context.locale, tz);
			if (rest[0] === "fmt") {
				const pattern = joined.replace(/^fmt:/, "") || "%Y-%m-%dT%H:%M:%S";
				return formatDateWithPattern(date, pattern, context.locale, tz);
			}
			return formatDateWithPattern(date, joined || "%Y-%m-%dT%H:%M:%S", context.locale, tz);
		}
	}

	if (token.startsWith("math:")) {
		const expr = token.slice(5);
		return evaluateMath(expr);
	}

	if (token.startsWith("upper:")) {
		const inner = token.slice(6);
		const resolved = await applyPlaceholders(inner, context, depth + 1);
		return resolved.toUpperCase();
	}

	if (token.startsWith("lower:")) {
		const inner = token.slice(6);
		const resolved = await applyPlaceholders(inner, context, depth + 1);
		return resolved.toLowerCase();
	}

	if (token.startsWith("title:")) {
		const inner = token.slice(6);
		const resolved = await applyPlaceholders(inner, context, depth + 1);
		return toTitleCase(resolved);
	}

	if (token.startsWith("truncate:")) {
		const parts = token.slice(9).split(":");
		const len = Number.parseInt(parts[0], 10);
		const rest = parts.slice(1).join(":");
		if (!Number.isFinite(len) || len < 0) return "";
		const resolved = await applyPlaceholders(rest, context, depth + 1);
		return resolved.length > len ? resolved.slice(0, len) : resolved;
	}

	if (token.startsWith("slice:")) {
		const parts = token.slice(6).split(":");
		const start = Number.parseInt(parts[0], 10);
		const end = Number.parseInt(parts[1] ?? "", 10);
		const rest = parts.slice(2).join(":");
		const resolved = await applyPlaceholders(rest, context, depth + 1);
		if (!Number.isFinite(start)) return "";
		return Number.isFinite(end) ? resolved.slice(start, end) : resolved.slice(start);
	}

	if (token.startsWith("urlencode:")) {
		const inner = token.slice(10);
		const resolved = await applyPlaceholders(inner, context, depth + 1);
		return encodeURIComponent(resolved);
	}

	if (token.startsWith("urldecode:")) {
		const inner = token.slice(10);
		const resolved = await applyPlaceholders(inner, context, depth + 1);
		try {
			return decodeURIComponent(resolved);
		} catch {
			return "";
		}
	}

	if (token.startsWith("if:")) {
		const payload = token.slice(3);
		const qIndex = payload.indexOf("?");
		const cIndex = payload.indexOf(":");
		if (qIndex === -1 || cIndex === -1 || cIndex < qIndex) return "";
		const condition = payload.slice(0, qIndex);
		const whenTrue = payload.slice(qIndex + 1, cIndex);
		const whenFalse = payload.slice(cIndex + 1);

		const resolvedCondition = await applyPlaceholders(condition, context, depth + 1);
		const truthy = booleanLike(resolvedCondition);
		const branch = truthy ? whenTrue : whenFalse;
		return applyPlaceholders(branch, context, depth + 1);
	}

	if (token.startsWith("rand.emoji")) {
		const setParam = token.split("set=")[1];
		const set = setParam?.split(":")[0] ?? "default";
		return pickRandom(emojiSets[set] ?? emojiSets.default);
	}

	if (token === "locale.name") return context.localeParts.language;
	if (token === "locale.region") return context.localeParts.region;

	if (token.startsWith("role.mention:")) {
		const id = token.slice("role.mention:".length);
		return /^\d+$/.test(id) ? `<@&${id}>` : id;
	}

	if (token.startsWith("channel.mention:")) {
		const id = token.slice("channel.mention:".length);
		return /^\d+$/.test(id) ? `<#${id}>` : id;
	}

	return `[[${token}]]`;
};

export const formatReply = async ({ template, interaction }: FormatReplyInput) => {
	const context = buildContext(interaction);

	let output = template;
	for (let i = 0; i < 4; i++) {
		const next = await applyPlaceholders(output, context, 0);
		if (next === output) break;
		output = next;
	}

	return output;
};
