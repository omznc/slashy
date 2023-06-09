import { z } from "zod";
import { ColorResolvable } from "discord.js";

const configSchema = z.object({
	DISCORD_TOKEN: z.string().length(59),
	DISCORD_CLIENT_ID: z.string().length(18),
	TOPGG_TOKEN: z.string().optional(),
	EXTRA_LOGGING: z.boolean().optional().default(false),
	LOGO: z
		.string()
		.url()
		.optional()
		.default("https://i.imgur.com/OpKkRY0.png"),
	COLOR: z
		.string()
		.optional()
		.default("#FF0000") as unknown as z.ZodLiteral<ColorResolvable>,
	DEVELOPERS: z.array(z.string().length(18)).optional().default([]),
});

const config = configSchema.parse(process.env);

export default config;
