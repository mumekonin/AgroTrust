import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const b64 = (value) => Buffer.from(value).toString('base64');

console.log('Copy these lines into backend/.env\n');
console.log(`JWT_PRIVATE_KEY=${b64(privatePem)}`);
console.log(`JWT_PUBLIC_KEY=${b64(publicPem)}`);
console.log('JWT_KEY_ID=k1');
console.log(`AUTH_PEPPER=${randomBytes(32).toString('base64')}`);