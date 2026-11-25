import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { adminRoutes } from './modules/admin/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { orderRoutes,webhookRoute } from './modules/orders/routes.js';
import type { Gateway } from './modules/payments/gateway.js';
import { cart,wishlist } from './modules/shopping/routes.js';
import { catalog,adminCatalog } from './modules/catalog/routes.js';
import { users,addresses } from './modules/users/routes.js';
import { requireUser,requireAdmin } from './modules/auth/session.js';
import { errorHandler } from './middleware/http.js';
import type { Mailer } from './config/mail.js';
export function createApp(origin:string,mailer?:Mailer,gateway?:Gateway){
  const app=express();app.disable('x-powered-by');app.use(helmet());app.post('/api/payments/webhook',express.raw({type:'application/json',limit:'64kb'}),webhookRoute(gateway));app.use(express.json({limit:'32kb'}));app.use(cookieParser());
  // Same-origin architecture; no cross-origin credentials. Reject unsafe requests without exact trusted Origin.
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('origin')!==origin){res.status(403).json({error:'Untrusted request origin.'});return;}
    next();
  });
  app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
  app.use('/api/auth',authRoutes(origin,mailer));app.use('/api/users',users);app.use('/api/addresses',addresses);
  app.use('/api/orders',orderRoutes(gateway));app.use('/api/cart',cart);app.use('/api/wishlist',wishlist);
  app.use('/api',catalog);app.use('/api/admin/catalog',adminCatalog);
  app.get('/api/admin/access',requireUser,requireAdmin,(_req,res)=>res.json({authorized:true}));
  app.use('/api/admin',adminRoutes(gateway));
  app.use('/api',(_req,res)=>res.status(404).json({error:'Not found.'}));app.use(errorHandler);
  return app;
}
