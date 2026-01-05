/**
 * TOTP (Time-based One-Time Password) Generator
 * RFC 6238 compliant implementation
 */

// Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode a Uint8Array to base32 string
 */
export function base32Encode(data: Uint8Array): string {
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of data) {
        value = (value << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            bits -= 5;
            result += BASE32_ALPHABET[(value >> bits) & 0x1f];
        }
    }

    if (bits > 0) {
        result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
    }

    return result;
}

/**
 * Generate a random Base32 secret key
 * @param length - Number of bytes for the secret (default: 20 = 32 chars base32)
 */
export function generateRandomSecret(length: number = 20): string {
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    return base32Encode(randomBytes);
}

/**
 * Convert a Base32 secret to hexadecimal string
 */
export function secretToHex(secret: string): string {
    try {
        const bytes = base32Decode(secret);
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join('');
    } catch {
        return '';
    }
}

/**
 * Get epoch information for TOTP calculation
 */
export function getEpochInfo(timeStep: number = 30): {
    epoch: number;
    iteration: number;
    iterationHex: string;
} {
    const epoch = Math.floor(Date.now() / 1000);
    const iteration = Math.floor(epoch / timeStep);
    const iterationHex = '0x' + iteration.toString(16).toUpperCase().padStart(16, '0');

    return { epoch, iteration, iterationHex };
}

/**
 * Decode a base32 encoded string to Uint8Array
 */
export function base32Decode(encoded: string): Uint8Array {
    // Remove spaces and convert to uppercase
    const cleaned = encoded.replace(/\s/g, '').toUpperCase();

    // Remove padding
    const unpadded = cleaned.replace(/=+$/, '');

    const output: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of unpadded) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error(`Invalid base32 character: ${char}`);
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            bits -= 8;
            output.push((value >> bits) & 0xff);
        }
    }

    return new Uint8Array(output);
}

/**
 * Convert a number to a byte array (big-endian)
 */
function numberToBytes(num: number, bytes: number = 8): Uint8Array {
    const result = new Uint8Array(bytes);
    for (let i = bytes - 1; i >= 0; i--) {
        result[i] = num & 0xff;
        num = Math.floor(num / 256);
    }
    return result;
}

/**
 * Generate HMAC-SHA1 using Web Crypto API
 */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key as unknown as ArrayBuffer,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message as unknown as ArrayBuffer);
    return new Uint8Array(signature);
}

/**
 * Dynamic Truncation as per RFC 4226
 */
function dynamicTruncation(hmacResult: Uint8Array, digits: number = 6): string {
    // Get offset from last nibble
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;

    // Get 4 bytes starting at offset
    const binary =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

    // Get the OTP value
    const otp = binary % Math.pow(10, digits);

    // Pad with leading zeros
    return otp.toString().padStart(digits, '0');
}

/**
 * Generate TOTP code
 * @param secret - Base32 encoded secret key
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits (default: 6)
 * @param timestamp - Optional timestamp (default: current time)
 */
export async function generateTOTP(
    secret: string,
    timeStep: number = 30,
    digits: number = 6,
    timestamp?: number
): Promise<string> {
    const time = timestamp ?? Math.floor(Date.now() / 1000);
    const counter = Math.floor(time / timeStep);

    const key = base32Decode(secret);
    const message = numberToBytes(counter);

    const hmac = await hmacSha1(key, message);
    return dynamicTruncation(hmac, digits);
}

/**
 * Get remaining seconds until next TOTP refresh
 */
export function getTimeRemaining(timeStep: number = 30): number {
    const now = Math.floor(Date.now() / 1000);
    return timeStep - (now % timeStep);
}

/**
 * Validate a base32 secret key format
 */
export function isValidBase32(secret: string): boolean {
    const cleaned = secret.replace(/\s/g, '').toUpperCase().replace(/=+$/, '');
    if (cleaned.length === 0) return false;

    for (const char of cleaned) {
        if (BASE32_ALPHABET.indexOf(char) === -1) {
            return false;
        }
    }
    return true;
}

/**
 * Generate TOTP codes for previous, current, and next time windows
 * @param secret - Base32 encoded secret key
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits (default: 6)
 */
export async function generateTOTPWithOffset(
    secret: string,
    timeStep: number = 30,
    digits: number = 6
): Promise<{ previous: string; current: string; next: string }> {
    const now = Math.floor(Date.now() / 1000);
    const currentWindow = Math.floor(now / timeStep) * timeStep;

    const [previous, current, next] = await Promise.all([
        generateTOTP(secret, timeStep, digits, currentWindow - timeStep),
        generateTOTP(secret, timeStep, digits, currentWindow),
        generateTOTP(secret, timeStep, digits, currentWindow + timeStep),
    ]);

    return { previous, current, next };
}
