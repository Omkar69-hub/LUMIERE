import { db } from '../../config/database.js';
import { digest,randomToken } from '../../utils/security.js';
import { wrap,HttpError } from '../../middleware/http.js';
import type { Request,Response } from 'express';
export const publicUser={id:true,email:true,name:true,mobile:true,role:true,emailVerifiedAt:true} as const;
export const cookieName=()=>process.env.NODE_ENV==='production'?'__Host-lumiere_session':'lumiere_session';
const cookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'});
export const readSession=(req:Request)=>{const value=req.cookies?.[cookieName()];return typeof value==='string' && /^[A-Za-z0-9_-]{43}$/.test(value)?digest(value):null;};
export async function revoke(req:Request,res:Response){const tokenHash=readSession(req);if(tokenHash)await db.session.deleteMany({where:{tokenHash}});res.clearCookie(cookieName(),cookieOptions());}
export async function issue(req:Request,res:Response,userId:string,remember:boolean){
  const previous=readSession(req), token=randomToken(), ttl=(remember?30:1)*86400000;
  await db.$transaction(async tx=>{if(previous)await tx.session.deleteMany({where:{tokenHash:previous}});await tx.session.create({data:{userId,tokenHash:digest(token),expiresAt:new Date(Date.now()+ttl)}});});
  res.cookie(cookieName(),token,{...cookieOptions(),...(remember?{maxAge:ttl}:{})});
}
export const requireUser=wrap(async(req,res,next)=>{
  const tokenHash=readSession(req);
  const session=tokenHash?await db.session.findUnique({where:{tokenHash},include:{user:{select:publicUser}}}):null;
  if(!session||session.expiresAt<=new Date())throw new HttpError(401,'Please sign in.');
  res.locals.user=session.user;next();
});
export const requireAdmin=wrap(async(_req,res,next)=>{if(res.locals.user?.role!=='ADMIN')throw new HttpError(403,'Access denied.');next();});
