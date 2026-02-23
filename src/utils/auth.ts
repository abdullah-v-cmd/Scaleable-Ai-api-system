// Authentication utilities using Web Crypto API

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Hash password using Web Crypto API (SHA-256)
 * Note: For production, consider using bcrypt via a Worker API
 */
export async function hashPassword(password: string): Promise<string> {
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate API key
 */
export function generateApiKey(prefix: string = 'apk'): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomString = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${randomString}`;
}

/**
 * Generate JWT token using Web Crypto API
 */
export async function generateJWT(payload: any, secret: string, expiresIn: number = 86400): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await sign(signatureInput, secret);
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verify JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = await sign(signatureInput, secret);
  const expectedEncodedSignature = base64UrlEncode(expectedSignature);

  if (encodedSignature !== expectedEncodedSignature) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Sign data with HMAC-SHA256
 */
async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return arrayBufferToString(signature);
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Convert ArrayBuffer to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  return String.fromCharCode(...new Uint8Array(buffer));
}

/**
 * Generate secure random string
 */
export function generateRandomString(length: number = 32): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
