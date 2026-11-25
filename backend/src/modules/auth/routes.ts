import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../../config/database.js';
import type { Mailer } from '../../config/mail.js';
import { HttpError,wrap } from '../../middleware/http.js';
import { digest,hashPassword,randomToken,verifyPassword } from '../../utils/security.js';
import { email,login,registration,reset } from './validation.js';
import { issue,publicUser,revoke,requireUser } from './session.js';
import type { TokenPurpose } from '@prisma/client';
const generic={message:'If the account is eligible, a link will be sent.'};
export function authRoutes(origin:string,mail?:Mailer){
  const router=Router();
  const limit=(max:number)=>rateLimit({windowMs:15*60*1000,limit:max,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many attempts. Try again later.'}});
  const authLimit=limit(10), recoveryLimit=limit(5);
  const dummy=hashPassword(randomToken());
  async function send(userId:string,to:string,purpose:TokenPurpose){
    if(!mail) return;
    const token=randomToken();
    await db.authToken.create({data:{userId,purpose,tokenHash:digest(token),expiresAt:new Date(Date.now()+(purpose==='RESET_PASSWORD'?30:1440)*60000)}});
    try{await mail(to,purpose,origin+(purpose==='RESET_PASSWORD'?'/reset-password':'/verify-email')+'#token='+token);}
    catch{await db.authToken.deleteMany({where:{tokenHash:digest(token)}});throw new HttpError(503,'Email service temporarily unavailable.');}
  }
  router.post('/register',authLimit,wrap(async(req,res)=>{
    const v=registration.parse(req.body);
    const user=await db.user.create({data:{email:v.email,name:v.name,mobile:v.mobile,passwordHash:await hashPassword(v.password),termsAcceptedAt:new Date()},select:publicUser});
    await issue(req,res,user.id,false);
    let verificationRequested=false;
    if(mail){try{await send(user.id,user.email,'VERIFY_EMAIL');verificationRequested=true;}catch{/* Account remains valid; resend is available. */}}
    res.status(201).json({user,verificationRequested,emailConfigured:!!mail});
  }));
  router.post('/login',authLimit,wrap(async(req,res)=>{
    const v=login.parse(req.body), user=await db.user.findUnique({where:{email:v.email}});
    const ok=await verifyPassword(user?.passwordHash??await dummy,v.password);
    if(!user||!ok)throw new HttpError(401,'Invalid email or password.');
    await issue(req,res,user.id,v.remember,user.passwordHash);
    res.json({user:{id:user.id,name:user.name,email:user.email,mobile:user.mobile,role:user.role,emailVerifiedAt:user.emailVerifiedAt}});
  }));
  router.post('/logout',wrap(async(req,res)=>{await revoke(req,res);res.status(204).end();}));
  router.get('/session',requireUser,(_req,res)=>res.json({user:res.locals.user}));
  router.post('/forgot-password',recoveryLimit,wrap(async(req,res)=>{
    const address=z.object({email}).strict().parse(req.body).email;
    if(!mail)throw new HttpError(503,'Email recovery is not configured.');
    const user=await db.user.findUnique({where:{email:address}});
    // Never expose per-account delivery errors in the response.
    if(user){try{await send(user.id,address,'RESET_PASSWORD');}catch{/* Generic response prevents enumeration. */}}
    res.status(202).json(generic);
  }));
  router.post('/resend-verification',recoveryLimit,requireUser,wrap(async(_req,res)=>{
    if(!mail)throw new HttpError(503,'Email verification is not configured.');
    const user=res.locals.user;
    if(!user.emailVerifiedAt)await send(user.id,user.email,'VERIFY_EMAIL');
    res.status(202).json(generic);
  }));
  router.post('/reset-password',recoveryLimit,wrap(async(req,res)=>{
    const v=reset.parse(req.body), tokenHash=digest(v.token), passwordHash=await hashPassword(v.password);
    await db.$transaction(async tx=>{
      const row=await tx.authToken.findUnique({where:{tokenHash}});
      if(!row||row.purpose!=='RESET_PASSWORD'||row.expiresAt<=new Date())throw new HttpError(400,'Invalid or expired link.');
      // Lock the account before consuming a token to serialize password changes and session issuance.
      await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id" = ${row.userId} FOR UPDATE`;
      const consumed=await tx.authToken.deleteMany({where:{id:row.id,expiresAt:{gt:new Date()}}});
      if(consumed.count!==1)throw new HttpError(400,'Invalid or expired link.');
      await tx.user.update({where:{id:row.userId},data:{passwordHash}});
      await tx.session.deleteMany({where:{userId:row.userId}});
      await tx.authToken.deleteMany({where:{userId:row.userId,purpose:'RESET_PASSWORD'}});
    });
    await revoke(req,res);res.json({message:'Password updated. Sign in again.'});
  }));
  router.post('/verify-email',recoveryLimit,wrap(async(req,res)=>{
    const {token}=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict().parse(req.body);
    await db.$transaction(async tx=>{
      const row=await tx.authToken.findUnique({where:{tokenHash:digest(token)}});
      if(!row||row.purpose!=='VERIFY_EMAIL'||row.expiresAt<=new Date())throw new HttpError(400,'Invalid or expired link.');
      const consumed=await tx.authToken.deleteMany({where:{id:row.id,expiresAt:{gt:new Date()}}});
      if(consumed.count!==1)throw new HttpError(400,'Invalid or expired link.');
      await tx.user.update({where:{id:row.userId},data:{emailVerifiedAt:new Date()}});
      await tx.authToken.deleteMany({where:{userId:row.userId,purpose:'VERIFY_EMAIL'}});
    });res.json({message:'Email verified.'});
  }));
  return router;
}
