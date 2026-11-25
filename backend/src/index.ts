import 'dotenv/config';
import { createApp } from './app.js';
import { configuredGateway } from './modules/payments/gateway.js';
import { configuredMailer } from './config/mail.js';
const origin=process.env.APP_ORIGIN;
if(!origin||!process.env.DATABASE_URL||new URL(origin).origin!==origin)throw new Error('Configure DATABASE_URL and APP_ORIGIN (origin only).');
if(process.env.NODE_ENV==='production'&&!origin.startsWith('https://'))throw new Error('Production requires HTTPS.');
createApp(origin,configuredMailer(),configuredGateway()).listen(Number(process.env.PORT||3001),()=>console.log('LUMIÈRE API started'));
