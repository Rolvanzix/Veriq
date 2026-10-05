import type { ArcVerifiableCredential, ArcVerifiablePresentation } from './types';

/**
 * Encodes a credential or presentation into a safe base64 URL string
 */
export function encodeCredentialToUrlPayload(
  data: ArcVerifiableCredential | ArcVerifiablePresentation
): string {
  const jsonStr = JSON.stringify(data);
  // Base64 encode safe for URL
  return btoa(encodeURIComponent(jsonStr));
}

/**
 * Decodes a base64 URL string back into a credential or presentation
 */
export function decodeCredentialFromUrlPayload<T = ArcVerifiableCredential>(
  payload: string
): T | null {
  try {
    const jsonStr = decodeURIComponent(atob(payload));
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error('Failed to decode payload:', e);
    return null;
  }
}

/**
 * Generates an independent verification link
 */
export function generateVerificationLink(
  credential: ArcVerifiableCredential,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
): string {
  const payload = encodeCredentialToUrlPayload(credential);
  return `${baseUrl}?mode=verifier&payload=${encodeURIComponent(payload)}`;
}
