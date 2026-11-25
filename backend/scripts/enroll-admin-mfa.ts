import 'dotenv/config';
import {db} from '../src/config/database.js';
import {decodeSecret,encryptSecret} from '../src/modules/auth/totp.js';
async function main(){
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),secret=process.env.ADMIN_TOTP_BASE32;
 if(!email||!secret)throw new Error('Provide ADMIN_EMAIL and ADMIN_TOTP_BASE32 securely.');
 const encrypted=encryptSecret(decodeSecret(secret));
 await db.$transaction(async tx=>{const u=await tx.user.findUnique({where:{email}});if(!u||u.role!=='ADMIN')throw new Error('Administrator not found.');await tx.user.update({where:{id:u.id},data:{mfaSecret:encrypted,mfaLastCounter:null}});await tx.session.deleteMany({where:{userId:u.id}});await tx.adminEvent.create({data:{actorId:u.id,action:'ADMIN_MFA_ENROLL_LOCAL',targetId:u.id}});});
 console.log('MFA enrolled. Existing sessions revoked. Clear local secret variables.');
}
main().catch(()=>{console.error('MFA enrollment failed. Check secure local settings.');process.exitCode=1;}).finally(()=>db.$disconnect());
