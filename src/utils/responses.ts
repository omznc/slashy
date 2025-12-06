export type JsonInit = number | ResponseInit;

export const jsonResponse = (data: unknown, init: JsonInit = 200) => {
	const status = typeof init === "number" ? init : (init.status ?? 200);

	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json",
			...(typeof init === "object" && init.headers ? init.headers : {}),
		},
	});
};
