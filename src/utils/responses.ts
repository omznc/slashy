export type JsonInit = number | ResponseInit;

export const jsonResponse = (data: unknown, init: JsonInit = 200) =>
	new Response(JSON.stringify(data), {
		status: typeof init === "number" ? init : (init.status ?? 200),
		headers: {
			"content-type": "application/json",
			...(typeof init === "object" && init.headers ? init.headers : {}),
		},
	});
