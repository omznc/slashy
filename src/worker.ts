import { type APIInteraction, InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { handleAdmin, primeAdminSecret } from "./admin";
import { createHandlerContext } from "./context";
import { resolveLocale, t } from "./i18n";
import { logInteractionDebug } from "./interactions/debug";
import { routeInteraction } from "./router";
import type { Env } from "./types";
import { jsonResponse } from "./utils/responses";
import { verifySignature } from "./utils/verify";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		primeAdminSecret(env);

		const adminResponse = await handleAdmin({ request, env });
		if (adminResponse) return adminResponse;

		if (request.method === "GET") return new Response("ok");

		const signature = request.headers.get("x-signature-ed25519");
		const timestamp = request.headers.get("x-signature-timestamp");
		const body = await request.text();

		if (!verifySignature({ body, signature, timestamp, publicKey: env.DISCORD_PUBLIC_KEY }))
			return new Response("invalid request", { status: 401 });

		const interaction = JSON.parse(body) as APIInteraction;
		logInteractionDebug(interaction);

		const context = createHandlerContext(env);

		try {
			return await routeInteraction({ interaction, context, ctx });
		} catch (error) {
			console.error("dispatch error", error);

			return jsonResponse({
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: t(resolveLocale(interaction), "errorTryAgain"), flags: MessageFlags.Ephemeral },
				},
			});
		}
	},
};
