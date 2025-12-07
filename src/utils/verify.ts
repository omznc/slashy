import nacl from "tweetnacl";

const encoder = new TextEncoder();

const hexToUint8 = (hex: string) => {
	const bytes = new Uint8Array(hex.length / 2);

	for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);

	return bytes;
};

export type VerifySignatureInput = {
	body: string;
	signature: string | null;
	timestamp: string | null;
	publicKey: string;
};

export const verifySignature = ({ body, signature, timestamp, publicKey }: VerifySignatureInput) => {
	if (!signature || !timestamp) return false;

	const message = encoder.encode(timestamp + body);

	return nacl.sign.detached.verify(message, hexToUint8(signature), hexToUint8(publicKey));
};
