import {Router} from 'express';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import {db} from '../../config/database.js';
import {wrap,HttpError} from '../../middleware/http.js';
import {requireUser,readSession} from './session.js';
import {decryptSecret,matchCounter,mfaRequired} from './totp.js';
export const adminMfa=Router();adminMfa.use(requireUser);
adminMfa.use((_req,res,next)=>{if(res.locals.user.role!=='ADMIN'){res.status(403).json({error:'Access denied.'});return;}next();});
adminMfa.get('/status',wrap(async(_req,res)=>{const u=await db.user.findUniqueOrThrow({where:{id:res.locals.user.id},select:{mfaSecret:true}});res.json({enrolled:!!u.mfaSecret,required:mfaRequired(!!u.mfaSecret),verified:!!res.locals.mfaVerifiedAt&&Date.now()-new Date(res.locals.mfaVerifiedAt).getTime()<=12*3600000});}));
adminMfa.post('/verify',rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many MFA attempts.'}}),wrap(async(req,res)=>{
 const {code}=z.object({code:z.string().regex(/^\d{6}$/)}).strict().parse(req.body),id:string=res.locals.user.id,tokenHash=readSession(req);
 if(!tokenHash)throw new HttpError(401,'Please sign in.');
 await db.$transaction(async tx=>{
  await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  const u=await tx.user.findUnique({where:{id},select:{mfaSecret:true,mfaLastCounter:true,role:true,suspendedAt:true}});
  if(!u?.mfaSecret||u.role!=='ADMIN'||u.suspendedAt)throw new HttpError(403,'Administrator MFA enrollment required.');
  const counter=matchCounter(decryptSecret(u.mfaSecret),code);
  if(counter===null||(u.mfaLastCounter!==null&&counter<=u.mfaLastCounter))throw new HttpError(401,'Invalid or already used verification code.');
  const updated=await tx.session.updateMany({where:{tokenHash,userId:id,expiresAt:{gt:new Date()}},data:{mfaVerifiedAt:new Date()}});
  if(!updated.count)throw new HttpError(401,'Please sign in.');
  await tx.user.update({where:{id},data:{mfaLastCounter:counter}});
 });res.json({verified:true});
}));
