import type { RedactionKind } from '../bundle/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JWT_RE = /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const BEARER_RE = /^Bearer\s+\S{8,}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HIGH_ENTROPY_RE = /^[A-Za-z0-9+/_=-]{40,}$/;

const KEY_KINDS: Array<[RegExp, RedactionKind]> = [
  [/^(password|passwd|pwd)$/i, 'password'],
  [/^(access_?token|refresh_?token|id_?token|jwt)$/i, 'jwt'],
  [/^(api_?key|apikey|x-api-key|client_?secret|secret)$/i, 'api-key'],
  [/^(cookie|set-cookie)$/i, 'cookie'],
  [/^(authorization|proxy-authorization)$/i, 'bearer'],
  [/(^|[-_])session([-_]|$)/i, 'api-key'],
  [/^(ssn|social_?security)$/i, 'password'],
  [/^(credit_?card|card_?number|cvv|cvc)$/i, 'password'],
  [/^(email|email_?address)$/i, 'email'],
  [/^(phone|phone_?number|mobile)$/i, 'phone'],
];

export function isSensitiveKey(key: string): RedactionKind | null {
  for (const [pattern, kind] of KEY_KINDS) {
    if (pattern.test(key)) return kind;
  }
  return null;
}

export function classifyValue(value: string): RedactionKind | null {
  // UUIDs first: they look high-entropy but carry the relational shape of the
  // data. Redacting them would break foreign-key correspondence downstream.
  if (UUID_RE.test(value)) return null;
  if (JWT_RE.test(value)) return 'jwt';
  if (BEARER_RE.test(value)) return 'bearer';
  if (EMAIL_RE.test(value)) return 'email';
  if (HIGH_ENTROPY_RE.test(value)) return 'high-entropy';
  return null;
}
