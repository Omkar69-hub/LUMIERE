import { createHmac,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '../../middleware/http.js';
export type GatewayPayment={id:string;order_id:string;amount:number;currency:string;status:string};
export interface Gateway {
 keyId:string;
 createOrder(amount:number,receipt:string):Promise<{id:string;amount:number;currency:string}>;
 fetchPayment(id:string):Promise<GatewayPayment>;
 verifyCheckout(orderId:string,paymentId:string,signature:string):boolean;
 verifyWebhook(raw:Buffer,signature:string):boolean;
}
export function signatureMatches(secret:string,data:string|Buffer,signature:string){
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 return timingSafeEqual(createHmac('sha256',secret).update(data).digest(),Buffer.from(signature,'hex'));
}
const orderSchema=z.object({id:z.string().regex(/^order_[A-Za-z0-9]+$/),amount:z.number().int(),currency:z.string()});
const paymentSchema=z.object({id:z.string().regex(/^pay_[A-Za-z0-9]+$/),order_id:z.string(),amount:z.number().int(),currency:z.string(),status:z.string()});
export function configuredGateway():Gateway|undefined{
 const {RAZORPAY_KEY_ID:keyId,RAZORPAY_KEY_SECRET:secret,RAZORPAY_WEBHOOK_SECRET:webhook}=process.env;
 if(!keyId&&!secret&&!webhook)return;
 if(!keyId?.startsWith('rzp_test_')||!secret||!webhook)throw new Error('Only complete Razorpay test-mode configuration is supported.');
 async function call(path:string,body?:unknown){
  const response=await fetch('https://api.razorpay.com/v1'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(keyId+':'+secret).toString('base64'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new HttpError(502,'Payment provider unavailable. Check order status before retrying.');
  return response.json();
 }
 return {keyId,createOrder:async(amount,receipt)=>orderSchema.parse(await call('/orders',{amount,currency:'INR',receipt,partial_payment:false})),fetchPayment:async id=>paymentSchema.parse(await call('/payments/'+encodeURIComponent(id))),verifyCheckout:(o,p,s)=>signatureMatches(secret,o+'|'+p,s),verifyWebhook:(raw,s)=>signatureMatches(webhook,raw,s)};
}
