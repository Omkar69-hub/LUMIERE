import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import { wrap,HttpError } from '../../middleware/http.js';
import { requireUser } from '../auth/session.js';
import type { Gateway,GatewayPayment } from '../payments/gateway.js';
const uuid=z.string().uuid();
const orderInclude={items:true} as const;
const publicOrder=(o:Prisma.OrderGetPayload<{include:typeof orderInclude}>)=>({id:o.id,status:o.status,gatewayState:o.gatewayState,subtotalPaise:o.subtotalPaise,shippingPaise:o.shippingPaise,totalPaise:o.totalPaise,address:o.addressSnapshot,items:o.items,createdAt:o.createdAt,paidAt:o.paidAt});
const verified=(res:{locals:Record<string,any>})=>{if(!res.locals.user.emailVerifiedAt)throw new HttpError(403,'Verify your email before checkout.');};
const shipping=0; // Explicit development/test policy only; change before release.
export async function confirmPayment(payment:GatewayPayment,eventId?:string){
 if(payment.status!=='captured')return false;
 return db.$transaction(async tx=>{
  const order=await tx.order.findUnique({where:{providerOrderId:payment.order_id}});
  if(!order)throw new HttpError(409,'Payment order not linked yet.');
  if(payment.amount!==order.totalPaise||payment.currency!=='INR')throw new HttpError(409,'Payment amount or currency mismatch.');
  await tx.$queryRaw `SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
  const latest=await tx.order.findUniqueOrThrow({where:{id:order.id}});
  if(latest.status==='PAID'&&latest.providerPaymentId!==payment.id)throw new HttpError(409,'Payment conflict requires review.');
  if(latest.status==='CANCELLED')throw new HttpError(409,'Cancelled order requires payment review.');
  if(eventId){const added=await tx.paymentEvent.createMany({data:[{id:eventId}],skipDuplicates:true});if(!added.count)return true;}
  if(latest.status!=='PAID')await tx.order.update({where:{id:order.id},data:{status:'PAID',providerPaymentId:payment.id,paidAt:new Date()}});
  return true;
 });
}
export function orderRoutes(gateway?:Gateway){
 const router=Router();router.use(requireUser);
 router.get('/configuration',(_req,res)=>res.json({paymentEnabled:!!gateway,testMode:true,shippingPaise:shipping}));
 router.get('/',wrap(async(req,res)=>{const {page}=z.object({page:z.coerce.number().int().min(1).max(1000).default(1)}).strict().parse(req.query);const rows=await db.order.findMany({where:{userId:res.locals.user.id},include:orderInclude,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:21});res.json({items:rows.slice(0,20).map(publicOrder),hasMore:rows.length>20});}));
 router.get('/:id',wrap(async(req,res)=>{const o=await db.order.findFirst({where:{id:uuid.parse(req.params.id),userId:res.locals.user.id},include:orderInclude});if(!o)throw new HttpError(404,'Order not found.');res.json(publicOrder(o));}));
 router.post('/',wrap(async(req,res)=>{
  verified(res);if(!gateway)throw new HttpError(503,'Test payments are not configured.');
  const {addressId,requestKey,expectedTotalPaise}=z.object({addressId:uuid,requestKey:uuid,expectedTotalPaise:z.number().int().min(1).max(2000000000)}).strict().parse(req.body),userId:string=res.locals.user.id;
  const o=await db.$transaction(async tx=>{
   await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
   const existing=await tx.order.findUnique({where:{userId_requestKey:{userId,requestKey}},include:orderInclude});if(existing)return existing;
   const outstanding=await tx.order.count({where:{userId,status:'PENDING_PAYMENT'}});if(outstanding>=1)throw new HttpError(409,'Resolve your existing pending order before creating another.');
   const address=await tx.address.findFirst({where:{id:addressId,userId}});if(!address)throw new HttpError(404,'Address not found.');
   const rows=await tx.cartItem.findMany({where:{userId},include:{variant:{include:{product:true}}},orderBy:{variantId:'asc'},take:101});
   if(!rows.length||rows.length>100)throw new HttpError(400,'Bag must contain 1–100 distinct items.');
   const items=[];let subtotal=0;
   for(const row of rows){
    const v=row.variant,p=v.product;
    if(!p.published||v.stock<row.quantity)throw new HttpError(409,'Bag inventory changed. Review your selection.');
    // Lock current product to prevent a concurrent price/publication edit.
    const current=await tx.$queryRaw<{pricePaise:number;published:boolean}[]> `SELECT "pricePaise","published" FROM "Product" WHERE "id" = ${p.id} FOR SHARE`;
    if(!current[0]?.published||current[0].pricePaise!==p.pricePaise)throw new HttpError(409,'Product changed. Refresh your bag.');
    const reserved=await tx.productVariant.updateMany({where:{id:v.id,stock:{gte:row.quantity}},data:{stock:{decrement:row.quantity}}});if(!reserved.count)throw new HttpError(409,'Stock changed. Refresh your bag.');
    subtotal+=p.pricePaise*row.quantity;items.push({variantId:v.id,name:p.name,sku:v.sku,size:v.size,color:v.color,quantity:row.quantity,unitPricePaise:p.pricePaise});
   }
   const total=subtotal+shipping;if(total!==expectedTotalPaise||total<100||total>2000000000)throw new HttpError(409,'Price changed or total outside supported range.');
   const {recipient,line1,city,state,postalCode,country}=address;
   const result=await tx.order.create({data:{userId,requestKey,addressSnapshot:{recipient,line1,city,state,postalCode,country},subtotalPaise:subtotal,shippingPaise:shipping,totalPaise:total,items:{create:items}},include:orderInclude});
   for(const row of rows){const removed=await tx.cartItem.deleteMany({where:{id:row.id,userId,quantity:row.quantity,updatedAt:row.updatedAt}});if(!removed.count)throw new HttpError(409,'Bag changed. Try again.');}
   return result;
  },{timeout:15000});
  res.status(201).json(publicOrder(o));
 }));
 router.post('/:id/cancel',wrap(async(req,res)=>{
  const id=uuid.parse(req.params.id),userId:string=res.locals.user.id;
  await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({where:{id,userId,status:'PENDING_PAYMENT',gatewayState:'NEW'},data:{status:'CANCELLED'}});if(!changed.count)throw new HttpError(409,'Only unstarted payment orders can be cancelled online.');
   const items=await tx.orderItem.findMany({where:{orderId:id},orderBy:{variantId:'asc'}});for(const i of items)await tx.productVariant.update({where:{id:i.variantId},data:{stock:{increment:i.quantity}}});
  });res.status(204).end();
 }));
 router.post('/:id/payment',wrap(async(req,res)=>{
  verified(res);if(!gateway)throw new HttpError(503,'Test payments are not configured.');
  const id=uuid.parse(req.params.id),userId:string=res.locals.user.id;
  const o=await db.order.findFirst({where:{id,userId,status:'PENDING_PAYMENT'}});if(!o)throw new HttpError(404,'Pending order not found.');
  if(o.gatewayState==='READY'&&o.providerOrderId){res.json({keyId:gateway.keyId,orderId:o.providerOrderId,amount:o.totalPaise,currency:'INR'});return;}
  const claim=await db.order.updateMany({where:{id,userId,status:'PENDING_PAYMENT',gatewayState:'NEW'},data:{gatewayState:'CREATING'}});
  if(!claim.count)throw new HttpError(409,'Payment setup already started. Check order status; support may need to reconcile it.');
  try{
   const provider=await gateway.createOrder(o.totalPaise,o.id);
   if(provider.amount!==o.totalPaise||provider.currency!=='INR')throw new Error('Provider order mismatch');
   await db.order.update({where:{id},data:{providerOrderId:provider.id,gatewayState:'READY'}});
   res.json({keyId:gateway.keyId,orderId:provider.id,amount:o.totalPaise,currency:'INR'});
  }catch{await db.order.updateMany({where:{id,gatewayState:'CREATING'},data:{gatewayState:'REVIEW'}});throw new HttpError(502,'Payment setup requires reconciliation. Do not create a duplicate order.');}
 }));
 router.post('/:id/verify',wrap(async(req,res)=>{
  if(!gateway)throw new HttpError(503,'Payments unavailable.');
  const id=uuid.parse(req.params.id),userId:string=res.locals.user.id;
  const data=z.object({paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/),signature:z.string().regex(/^[a-f0-9]{64}$/i)}).strict().parse(req.body);
  const o=await db.order.findFirst({where:{id,userId}});if(!o?.providerOrderId)throw new HttpError(404,'Payment order not found.');
  if(!gateway.verifyCheckout(o.providerOrderId,data.paymentId,data.signature))throw new HttpError(400,'Invalid payment signature.');
  const p=await gateway.fetchPayment(data.paymentId);
  if(p.id!==data.paymentId||p.order_id!==o.providerOrderId||p.amount!==o.totalPaise||p.currency!=='INR')throw new HttpError(409,'Payment details mismatch.');
  const paid=await confirmPayment(p);res.json({status:paid?'PAID':'PENDING_PAYMENT'});
 }));
 return router;
}
export function webhookRoute(gateway?:Gateway){
 return wrap(async(req,res)=>{
  if(!gateway)throw new HttpError(503,'Payments unavailable.');
  const sig=req.get('x-razorpay-signature')||'',eventId=req.get('x-razorpay-event-id')||'';
  if(!Buffer.isBuffer(req.body)||!gateway.verifyWebhook(req.body,sig))throw new HttpError(400,'Invalid webhook signature.');
  if(!eventId||eventId.length>200)throw new HttpError(400,'Missing event identifier.');
  const event=z.object({event:z.string(),payload:z.unknown()}).parse(JSON.parse(req.body.toString('utf8')));
  if(event.event!=='payment.captured'){res.status(200).json({received:true});return;}
  const data=z.object({payment:z.object({entity:z.object({id:z.string().regex(/^pay_[A-Za-z0-9]+$/)})})}).parse(event.payload);
  const payment=await gateway.fetchPayment(data.payment.entity.id);
  if(payment.id!==data.payment.entity.id||payment.status!=='captured')throw new HttpError(409,'Payment not confirmed.');
  await confirmPayment(payment,eventId);res.json({received:true});
 });
}
