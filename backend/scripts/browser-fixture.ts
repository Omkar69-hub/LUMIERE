import 'dotenv/config';
import {db} from '../src/config/database.js';
import {hashPassword} from '../src/utils/security.js';
const [action,tag]=process.argv.slice(2);
if(!process.env.TEST_DATABASE_URL||process.env.DATABASE_URL!==process.env.TEST_DATABASE_URL||!tag||! /^[a-f0-9-]{36}$/.test(tag)||!['create','delete'].includes(action))throw new Error('Isolated test database and unique fixture ID required.');
const emails=[tag+'-admin@example.invalid',tag+'-customer@example.invalid'];
async function main(){
 if(action==='create'){
 const passwordHash=await hashPassword('Browser fixture password 123');
 await db.$transaction(async tx=>{await tx.user.createMany({data:emails.map((email,i)=>({email,passwordHash,name:'Browser fixture',mobile:'9999999999',role:i===0?'ADMIN':'CUSTOMER',termsAcceptedAt:new Date(),emailVerifiedAt:new Date()}))});await tx.category.create({data:{slug:tag,name:'QA category '+tag}});await tx.brand.create({data:{slug:tag,name:'QA brand '+tag}});});
 }else{
 await db.$transaction(async tx=>{await tx.adminEvent.deleteMany({where:{actor:{email:{in:emails}}}});await tx.supportTicket.deleteMany({where:{user:{email:{in:emails}}}});await tx.user.deleteMany({where:{email:{in:emails}}});await tx.product.deleteMany({where:{slug:tag}});await tx.category.deleteMany({where:{slug:tag}});await tx.brand.deleteMany({where:{slug:tag}});});
 }
}
main().catch(()=>{console.error('Browser fixture operation failed.');process.exitCode=1;}).finally(()=>db.$disconnect());
