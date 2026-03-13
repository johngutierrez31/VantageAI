import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const SECRET_VERSION = 'v1';

function getConnectorKey() {
  const secret =
    process.env.CONNECTOR_SECRET_KEY ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    'vantage-local-connector-secret';

  return createHash('sha256').update(secret).digest();
}

export function encryptConnectorSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getConnectorKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [SECRET_VERSION, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptConnectorSecret(value: string | null | undefined) {
  if (!value) return null;

  const [version, ivBase64, tagBase64, payloadBase64] = value.split(':');
  if (version !== SECRET_VERSION || !ivBase64 || !tagBase64 || !payloadBase64) {
    throw new Error('INVALID_CONNECTOR_SECRET');
  }

  const decipher = createDecipheriv('aes-256-gcm', getConnectorKey(), Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
