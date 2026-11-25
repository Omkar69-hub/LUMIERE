import 'dotenv/config';
import { z } from 'zod';
import { db } from '../src/config/database.js';
import { hashPassword } from '../src/utils/security.js';
const schema=z.object({ADMIN_EMAIL:z.string().email().max(254),ADMIN_NAME:z.string().trim().min(2).max(100),ADMIN_MOBILE:z.string().regex(/^\+?[0-9]{10,15}$/),ADMIN_PASSWORD:z.string().min(16).max(128)});
async function main(){
 const v=schema.safeParse(process.env);if(!v.success)throw new Error('Set ADMIN_EMAIL, ADMIN_NAME, ADMIN_MOBILE and ADMIN_PASSWORD (16+ characters) securely in the local environment.');
 const a=v.data,email=a.ADMIN_EMAIL.toLowerCase();
 if(await db.user.findUnique({where:{email}}))throw new Error('Account already exists; no automatic promotion is permitted.');
 await db.user.create({data:{email,name:a.ADMIN_NAME,mobile:a.ADMIN_MOBILE,passwordHash:await hashPassword(a.ADMIN_PASSWORD),role:'ADMIN',termsAcceptedAt:new Date()}});
 console.log('Administrator created. Clear bootstrap environment secrets.');
}
main().catch(()=>{console.error('Administrator creation failed. Check local configuration and account uniqueness.');process.exitCode=1;}).finally(()=>db.$disconnect());
