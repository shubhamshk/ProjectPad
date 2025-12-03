import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex, decodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 32; // 256 bits

async function getKey(): Promise<CryptoKey> {
    const keyHex = Deno.env.get("ENCRYPTION_KEY");
    if (!keyHex) {
        throw new Error("ENCRYPTION_KEY is not set");
    }
    const keyBytes = decodeHex(keyHex);
    return await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: ALGORITHM },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(text: string): Promise<{ encrypted: string; iv: string }> {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        encodedText
    );

    return {
        encrypted: encodeHex(new Uint8Array(encryptedBuffer)),
        iv: encodeHex(iv),
    };
}

export async function decrypt(encryptedHex: string, ivHex: string): Promise<string> {
    const key = await getKey();
    const encryptedBytes = decodeHex(encryptedHex);
    const iv = decodeHex(ivHex);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        encryptedBytes
    );

    return new TextDecoder().decode(decryptedBuffer);
}
