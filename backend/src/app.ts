import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRoutes } from './modules/auth/routes.js';
import { users,addresses } from './modules/users/routes.js';
import { requireUser,requireAdmin } from './modules/auth/session.js';
import { errorHandler } from './middleware/http.js';
import type { Mailer } from './config/mail.js';
export function createApp(origin:string,mailer?:Mailer){
  const app=express();app.disable('x-powered-by');app.use(helmet());app.use(express.json({limit:'32kb'}));app.use(cookieParser());
  // Same-origin architecture; no cross-origin credentials. Reject unsafe requests without exact trusted Origin.
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('origin')!==origin){res.status(403).json({error:'Untrusted request origin.'});return;}
    next();
  });
  app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
  app.use('/api/auth',authRoutes(origin,mailer));app.use('/api/users',users);app.use('/api/addresses',addresses);
  app.get('/api/admin/access',requireUser,requireAdmin,(_req,res)=>res.json({authorized:true}));
  app.use('/api',(_req,res)=>res.status(404).json({error:'Not found.'}));app.use(errorHandler);
  return app;
}
