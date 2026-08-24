import type { Pseudonymizer } from './pseudonym';
import { redactHeaders } from './headers';
import { redactHtmlHydration, redactJsonText } from './json';

export interface RedactableRequest {
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  mimeType: string | null;
  requestBody: string | null;
  responseBody: string | null;
}

export interface RedactedRequest {
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string | null;
  responseBody: string | null;
}

/**
 * JavaScript and CSS are public code. Mutating them would corrupt parsing and
 * invalidate source-map offsets, destroying the material reconstruction needs.
 */
function isImmutableAsset(mimeType: string | null): boolean {
  if (!mimeType) return false;
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    base.includes('javascript') ||
    base === 'text/css' ||
    base.startsWith('image/') ||
    base.startsWith('font/')
  );
}

function isHtml(mimeType: string | null): boolean {
  return (mimeType ?? '').toLowerCase().includes('html');
}

export function redactRequest(
  input: RedactableRequest,
  pseudonym: Pseudonymizer
): RedactedRequest {
  let responseBody = input.responseBody;

  if (responseBody !== null) {
    if (isImmutableAsset(input.mimeType)) {
      // left exactly as served
    } else if (isHtml(input.mimeType)) {
      responseBody = redactHtmlHydration(responseBody, pseudonym);
    } else {
      responseBody = redactJsonText(responseBody, pseudonym);
    }
  }

  return {
    requestHeaders: redactHeaders(input.requestHeaders, pseudonym),
    responseHeaders: redactHeaders(input.responseHeaders, pseudonym),
    requestBody:
      input.requestBody === null
        ? null
        : redactJsonText(input.requestBody, pseudonym),
    responseBody,
  };
}
