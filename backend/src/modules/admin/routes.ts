import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import { wrap,HttpError } from '../../middleware/http.js';
import { requireUser,requireAdmin } from '../auth/session.js';
import {queueOrderNotice} from '../orders/notifications.js';
import { confirmPayment } from '../orders/routes.js';
import type { Gateway } from '../payments/gateway.js';
const uuid=z.string().uuid();
const text=z.string().trim().min(1).max(100);
const pageSchema=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),q:z.string().trim().max(100).optional()}).strict();
const customerSelect={id:true,name:true,email:true,mobile:true,emailVerifiedAt:true,suspendedAt:true,createdAt:true,_count:{select:{orders:true}}} as const;
const audit=(tx:Prisma.TransactionClient,actorId:string,action:string,targetId:string)=>tx.adminEvent.create({data:{actorId,action,targetId}});
const orderInclude={user:{select:{id:true,name:true,email:true}},items:true} as const;
export function adminRoutes(gateway?:Gateway){
 const router=Router();router.use(requireUser,requireAdmin);
 router.get('/overview',wrap(async(req,res)=>{
  const {days}=z.object({days:z.coerce.number().int().min(1).max(365).default(30)}).strict().parse(req.query),since=new Date(Date.now()-days*86400000);
  const [customers,products,variants,lowStock,orders,pending,paid,revenue,top,series,stock,openSupport,requestedReturns,approvedReturns,receivedReturns,recent,alerts]=await db.$transaction([
   db.user.count({where:{role:'CUSTOMER'}}),db.product.count({where:{published:true}}),db.productVariant.count(),db.productVariant.count({where:{stock:{lte:5},product:{published:true}}}),db.order.count({where:{createdAt:{gte:since}}}),db.order.count({where:{status:'PENDING_PAYMENT'}}),db.order.count({where:{status:'PAID',paidAt:{gte:since}}}),db.order.aggregate({where:{status:'PAID',paidAt:{gte:since}},_sum:{totalPaise:true}}),
   db.orderItem.groupBy({by:['name'],where:{order:{status:'PAID',paidAt:{gte:since}}},_sum:{quantity:true},orderBy:{_sum:{quantity:'desc'}},take:10}),
   db.$queryRaw<{day:string;revenuePaise:bigint;orders:bigint}[]>`SELECT to_char("paidAt",'YYYY-MM-DD') AS day, SUM("totalPaise")::bigint AS "revenuePaise",COUNT(*) AS orders FROM "Order" WHERE status='PAID' AND "paidAt">=${since} GROUP BY 1 ORDER BY 1`,
   db.productVariant.aggregate({where:{product:{published:true}},_sum:{stock:true}}),db.supportTicket.count({where:{status:'OPEN'}}),db.returnRequest.count({where:{status:'REQUESTED'}}),db.returnRequest.count({where:{status:'APPROVED'}}),db.returnRequest.count({where:{status:'RECEIVED'}}),
   db.order.findMany({take:6,orderBy:[{createdAt:'desc'},{id:'asc'}],select:{id:true,status:true,fulfillment:true,paymentMethod:true,totalPaise:true,createdAt:true,user:{select:{name:true}}}}),
   db.productVariant.findMany({where:{stock:{lte:5},product:{published:true}},take:8,orderBy:[{stock:'asc'},{id:'asc'}],select:{id:true,sku:true,size:true,color:true,stock:true,product:{select:{name:true}}}})
  ],{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
  res.json({testMode:true,days,customers,products,variants,lowStock,orders,pending,paid,revenuePaise:revenue._sum.totalPaise??0,availableStock:stock._sum.stock??0,openSupport,requestedReturns,approvedReturns,receivedReturns,recent,alerts,top:top.map(x=>({name:x.name,quantity:x._sum?.quantity??0})),series:series.map(x=>({day:x.day,revenuePaise:Number(x.revenuePaise),orders:Number(x.orders)}))});
 }));
 router.get('/customers',wrap(async(req,res)=>{
  const {page,q}=pageSchema.parse(req.query);const where:Prisma.UserWhereInput={role:'CUSTOMER',...(q?{OR:[{email:{contains:q,mode:'insensitive'}},{name:{contains:q,mode:'insensitive'}}]}:{})};
  const rows=await db.user.findMany({where,select:customerSelect,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*25,take:26});res.json({items:rows.slice(0,25),hasMore:rows.length>25});
 }));
 router.get('/customers/:id',wrap(async(req,res)=>{const id=uuid.parse(req.params.id);const user=await db.user.findFirst({where:{id,role:'CUSTOMER'},select:customerSelect});if(!user)throw new HttpError(404,'Customer not found.');const orders=await db.order.findMany({where:{userId:id},select:{id:true,status:true,fulfillment:true,totalPaise:true,createdAt:true},orderBy:{createdAt:'desc'},take:20});res.json({user,orders});}));
 router.patch('/customers/:id/status',wrap(async(req,res)=>{
  const id=uuid.parse(req.params.id),{suspended}=z.object({suspended:z.boolean()}).strict().parse(req.body);
  await db.$transaction(async tx=>{
   const updated=await tx.user.updateMany({where:{id,role:'CUSTOMER'},data:{suspendedAt:suspended?new Date():null}});if(!updated.count)throw new HttpError(404,'Customer not found.');
   if(suspended){await tx.session.deleteMany({where:{userId:id}});await tx.authToken.deleteMany({where:{userId:id}});}
   await audit(tx,res.locals.user.id,suspended?'CUSTOMER_SUSPEND':'CUSTOMER_RESTORE',id);
  });res.json({message:'Customer status updated.'});
 }));
 router.get('/orders',wrap(async(req,res)=>{
  const {page,q,status}=pageSchema.extend({status:z.enum(['PENDING_PAYMENT','PAID','CANCELLED']).optional()}).parse(req.query);
  const where:Prisma.OrderWhereInput={...(status?{status}:{}),...(q?{OR:[{id:{contains:q}},{user:{email:{contains:q,mode:'insensitive'}}}]}:{})};
  const rows=await db.order.findMany({where,include:orderInclude,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*25,take:26});res.json({items:rows.slice(0,25),hasMore:rows.length>25});
 }));
 router.get('/orders/:id',wrap(async(req,res)=>{const order=await db.order.findUnique({where:{id:uuid.parse(req.params.id)},include:{...orderInclude,notifications:{orderBy:{createdAt:'asc'}}}});if(!order)throw new HttpError(404,'Order not found.');res.json(order);}));
 router.patch('/orders/:id/fulfillment',wrap(async(req,res)=>{
  const id=uuid.parse(req.params.id),v=z.object({status:z.enum(['PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED']),carrier:text.optional(),trackingNumber:text.optional(),cashCollected:z.literal(true).optional()}).strict().parse(req.body);
  if(v.status==='SHIPPED'&&(!v.carrier||!v.trackingNumber))throw new HttpError(400,'Carrier and tracking number are required.');
  if(v.status!=='SHIPPED'&&(v.carrier||v.trackingNumber))throw new HttpError(400,'Tracking details belong to shipment.');
  const prior={PACKING:'UNFULFILLED',SHIPPED:'PACKING',OUT_FOR_DELIVERY:'SHIPPED',DELIVERED:'OUT_FOR_DELIVERY'} as const;
  await db.$transaction(async tx=>{
   await tx.$queryRaw `SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
   const order=await tx.order.findUnique({where:{id}});
   const cod=order?.paymentMethod==='COD';
   if(!order||order.fulfillment!==prior[v.status]||!(cod?order.status==='PENDING_PAYMENT':order.status==='PAID'))throw new HttpError(409,'Order cannot advance this fulfillment step.');
   if(cod&&(process.env.NODE_ENV==='production'||process.env.COD_TEST_ENABLED!=='true'))throw new HttpError(503,'Test COD is disabled.');
   const collect=cod&&v.status==='DELIVERED';
   if(collect!==!!v.cashCollected)throw new HttpError(400,'Confirm test cash collection only when delivering a COD order.');
   await tx.order.update({where:{id},data:{fulfillment:v.status,...(v.status==='SHIPPED'?{carrier:v.carrier,trackingNumber:v.trackingNumber}:{}),...(collect?{status:'PAID',paidAt:new Date()}: {})}});
   await audit(tx,res.locals.user.id,'FULFILLMENT_'+v.status,id);
   await queueOrderNotice(tx,id,v.status);
   if(collect)await audit(tx,res.locals.user.id,'COD_TEST_CASH_COLLECTED',id);
  });
  res.json({message:'Fulfillment updated.'});
 }));
 router.post('/orders/:id/cancel',wrap(async(req,res)=>{
  const id=uuid.parse(req.params.id);
  await db.$transaction(async tx=>{const changed=await tx.order.updateMany({where:{id,status:'PENDING_PAYMENT',gatewayState:'NEW',fulfillment:'UNFULFILLED'},data:{status:'CANCELLED'}});if(!changed.count)throw new HttpError(409,'Only orders without started gateway payment can be cancelled.');const items=await tx.orderItem.findMany({where:{orderId:id},orderBy:{variantId:'asc'}});for(const item of items)await tx.productVariant.update({where:{id:item.variantId},data:{stock:{increment:item.quantity}}});await audit(tx,res.locals.user.id,'ORDER_CANCEL',id);await queueOrderNotice(tx,id,'CANCELLED');});res.status(204).end();
 }));
 router.post('/orders/:id/reconcile',wrap(async(req,res)=>{
  if(!gateway)throw new HttpError(503,'Test payment provider is not configured.');
  const id=uuid.parse(req.params.id),{paymentId}=z.object({paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/)}).strict().parse(req.body);
  const order=await db.order.findUnique({where:{id}});if(!order?.providerOrderId)throw new HttpError(409,'No linked provider order. Review in the provider dashboard.');
  const p=await gateway.fetchPayment(paymentId);if(p.id!==paymentId||p.order_id!==order.providerOrderId||p.amount!==order.totalPaise||p.currency!=='INR'||p.status!=='captured')throw new HttpError(409,'Provider has not confirmed matching captured payment.');
  await confirmPayment(p);await db.adminEvent.create({data:{actorId:res.locals.user.id,action:'PAYMENT_RECONCILE',targetId:id}});res.json({message:'Captured test payment confirmed.'});
 }));
 router.get('/events',wrap(async(req,res)=>{const {page}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1)}).strict().parse(req.query);const rows=await db.adminEvent.findMany({orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*25,take:26,select:{id:true,action:true,targetId:true,createdAt:true,actor:{select:{id:true,name:true}}}});res.json({items:rows.slice(0,25),hasMore:rows.length>25});}));
 return router;
}
