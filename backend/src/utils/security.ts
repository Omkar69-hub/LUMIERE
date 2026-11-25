import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = (s:string) => createHash('sha256').update(s).digest('hex');
export const hashPassword = (password:string) => argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
export const verifyPassword = (hash:string,password:string) => argon2.verify(hash,password);
