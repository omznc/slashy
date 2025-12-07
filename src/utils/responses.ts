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
