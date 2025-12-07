import { translations } from "./translations";

type Vars = Record<string, string | number>;

type MessageKey = Extract<keyof typeof translations, string>;
type SupportedLocale = keyof (typeof translations)[MessageKey];

const fallbackLocale: SupportedLocale = "en-US";

const supportedLocales = new Set(Object.values(translations).flatMap((entry) => Object.keys(entry)));
const localeMap = new Map([...supportedLocales].map((key) => [key.toLowerCase(), key as SupportedLocale]));

const normalizeLocale = (locale?: string) => {
	if (!locale) return fallbackLocale;
	const lower = locale.toLowerCase();
	const exact = localeMap.get(lower);
	if (exact) return exact;
	const base = localeMap.get(lower.split("-")[0]);
	return base ?? fallbackLocale;
};

const applyVars = (template: string, vars?: Vars) => {
	if (!vars) return template;
	return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)), template);
};

export const resolveLocale = (input?: { locale?: string; guild_locale?: string } | string) => {
	if (typeof input === "string") return normalizeLocale(input);
	return normalizeLocale(input?.locale ?? input?.guild_locale);
};

export const t = (
	input: { locale?: SupportedLocale; guild_locale?: string } | string | undefined,
	key: MessageKey,
	vars?: Vars,
) => {
	const locale = resolveLocale(input);
	const table = translations[key];
	const template = table[locale as SupportedLocale] ?? table[fallbackLocale];
	return applyVars(template, vars);
};

export const localizations = (key: MessageKey) => {
	const table = translations[key];
	const entries: Record<string, string> = {};
	for (const [locale, value] of Object.entries(table)) {
		if (locale === fallbackLocale) continue;
		entries[locale] = value;
	}
	return entries;
};
