import {createCipheriv,createDecipheriv,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function decodeSecret(input:string){
 const raw=input.toUpperCase().replace(/\s+/g,'').replace(/=+$/,'');
 if(!/^[A-Z2-7]{32,128}$/.test(raw))throw new Error('Use a Base32 secret with at least 160 bits.');
 let bits=0,value=0;const out:number[]=[];
 for(const char of raw){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}
 return Buffer.from(out);
}
function key(){const v=process.env.ADMIN_MFA_ENCRYPTION_KEY;if(!v||! /^[a-f0-9]{64}$/i.test(v))throw new Error('Configure a 32-byte hexadecimal MFA encryption key.');return Buffer.from(v,'hex');}
export function encryptSecret(secret:Buffer){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const value=Buffer.concat([c.update(secret),c.final()]);return [iv,c.getAuthTag(),value].map(x=>x.toString('base64url')).join('.');}
export function decryptSecret(value:string){const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64url'));const d=createDecipheriv('aes-256-gcm',key(),iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]);}
export function codeAt(secret:Buffer,counter:bigint){const buf=Buffer.alloc(8);buf.writeBigUInt64BE(counter);const h=createHmac('sha1',secret).update(buf).digest(),offset=h[h.length-1]&15;return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
export function matchCounter(secret:Buffer,code:string,now=Date.now()):bigint|null{
 if(!/^\d{6}$/.test(code))return null;
 const current=BigInt(Math.floor(now/30000));
 for(const delta of [0n,-1n,1n]){const c=current+delta;if(c>=0n&&timingSafeEqual(Buffer.from(codeAt(secret,c)),Buffer.from(code)))return c;}return null;
}
export const mfaRequired=(enrolled:boolean)=>enrolled||process.env.NODE_ENV==='production'||process.env.ADMIN_MFA_REQUIRED==='true';
