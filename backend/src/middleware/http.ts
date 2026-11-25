import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
export const wrap = (fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>):RequestHandler =>
  (req,res,next)=>{void fn(req,res,next).catch(next);};
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export function errorHandler(err:unknown,_req:Request,res:Response,_next:NextFunction){
  if(err instanceof ZodError){res.status(400).json({error:'Check your input.',fields:err.issues.map(i=>({field:i.path.join('.'),message:i.message}))});return;}
  if(err instanceof HttpError){res.status(err.status).json({error:err.message});return;}
  if(err && typeof err==='object' && 'code' in err && err.code==='P2002'){res.status(409).json({error:'This record already exists.'});return;}
  if(err && typeof err==='object' && 'type' in err && err.type==='entity.too.large'){res.status(413).json({error:'Request exceeds the permitted size.'});return;}
  if(err && typeof err==='object' && 'type' in err && err.type==='encoding.unsupported'){res.status(415).json({error:'Unsupported content encoding.'});return;}
  if(err instanceof SyntaxError){res.status(400).json({error:'Invalid JSON.'});return;}
  res.status(500).json({error:'Unexpected server error.'});
}
