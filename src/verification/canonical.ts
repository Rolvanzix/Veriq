import { keccak256, stringToBytes, type Hash } from 'viem';

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) deterministic serializer.
 * Recursively sorts all object keys lexicographically by Unicode codepoints,
 * eliminates arbitrary whitespace, and formats numbers/booleans deterministically.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Cannot canonicalize non-finite number');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeJson(item));
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const pairs: string[] = [];
    for (const key of sortedKeys) {
      const v = obj[key];
      // Skip undefined values in object canonicalization
      if (v !== undefined) {
        pairs.push(`${JSON.stringify(key)}:${canonicalizeJson(v)}`);
      }
    }
    return `{${pairs.join(',')}}`;
  }
  return JSON.stringify(value);
}

export interface CanonicalClaimsResult {
  canonicalString: string;
  claimsDigest: Hash;
  claimHashes: Record<string, Hash>;
  salts: Record<string, string>;
}

/**
 * Generates a pseudo-random deterministic salt for a claim key if none provided
 */
function generateSalt(key: string, seed?: string): string {
  const input = `${key}:${seed || 'arc_default_salt'}:${Date.now()}`;
  return keccak256(stringToBytes(input)).slice(2, 18);
}

/**
 * Computes deterministic canonical claims digest and individual salted claim hashes
 * for future selective disclosure support.
 */
export function computeCanonicalClaimsDigest(
  claims: Record<string, unknown>,
  existingSalts?: Record<string, string>
): CanonicalClaimsResult {
  const canonicalString = canonicalizeJson(claims);
  const claimsDigest = keccak256(stringToBytes(canonicalString));

  const claimHashes: Record<string, Hash> = {};
  const salts: Record<string, string> = { ...existingSalts };

  const sortedKeys = Object.keys(claims).sort();
  for (const key of sortedKeys) {
    if (!salts[key]) {
      salts[key] = generateSalt(key, claimsDigest);
    }
    const valCanonical = canonicalizeJson(claims[key]);
    const leafInput = `${key}:${valCanonical}:${salts[key]}`;
    claimHashes[key] = keccak256(stringToBytes(leafInput));
  }

  return {
    canonicalString,
    claimsDigest,
    claimHashes,
    salts,
  };
}
