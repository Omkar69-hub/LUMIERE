import {Router} from 'express';
import {z} from 'zod';
import {db} from '../../config/database.js';
import {wrap,HttpError} from '../../middleware/http.js';
import {requireUser,requireAdmin} from '../auth/session.js';
import type {Gateway,GatewayRefund} from '../payments/gateway.js';
import type {RefundStatus} from '../../generated/prisma/client.js';
const uuid=z.string().uuid();
const providerId=z.string().regex(/^rfnd_[A-Za-z0-9]+$/);
async function record(id:string,orderId:string,paymentId:string,amount:number,p:GatewayRefund,actorId:string){
 if(p.payment_id!==paymentId||p.amount!==amount||p.currency!=='INR'||p.receipt!==id)throw new HttpError(409,'Refund details do not match the local request.');
 const status:RefundStatus=p.status==='processed'?'PROCESSED':p.status==='failed'?'FAILED':'PENDING';
 return db.$transaction(async tx=>{
  await tx.$queryRaw `SELECT "id" FROM "Refund" WHERE "id" = ${id} FOR UPDATE`;
  const old=await tx.refund.findUniqueOrThrow({where:{id}});
  if(old.providerRefundId&&old.providerRefundId!==p.id)throw new HttpError(409,'Refund reference conflict.');
  if(old.status==='PROCESSED'){if(status!=='PROCESSED')throw new HttpError(409,'Provider status conflict requires review.');return old;}
  const next=await tx.refund.update({where:{id},data:{providerRefundId:p.id,status}});
  await tx.adminEvent.create({data:{actorId,action:'REFUND_'+status,targetId:orderId}});return next;
 });
}
export function refundRoutes(gateway?:Gateway){
 const router=Router();router.use(requireUser,requireAdmin);
 router.get('/:orderId',wrap(async(req,res)=>{const orderId=uuid.parse(req.params.orderId);res.json({refund:await db.refund.findUnique({where:{orderId}}),enabled:!!gateway?.createRefund&&!!gateway?.fetchRefund});}));
 router.post('/:orderId',wrap(async(req,res)=>{
  if(!gateway?.createRefund||!gateway.fetchRefund)throw new HttpError(503,'Test refund provider is not configured.');
  const orderId=uuid.parse(req.params.orderId),actorId:string=res.locals.user.id;
  z.object({confirm:z.literal(true)}).strict().parse(req.body);
  const claim=await db.$transaction(async tx=>{
   await tx.$queryRaw `SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
   const order=await tx.order.findUnique({where:{id:orderId},include:{returnRequest:true,refund:true}});
   if(!order||order.status!=='PAID'||order.returnRequest?.status!=='RECEIVED'||!order.providerPaymentId)throw new HttpError(409,'Only a received return with a confirmed payment can be refunded.');
   if(order.refund)throw new HttpError(409,'Refund already recorded. Reconcile instead of retrying.');
   const refund=await tx.refund.create({data:{orderId,amountPaise:order.totalPaise}});
   await tx.adminEvent.create({data:{actorId,action:'REFUND_CREATE',targetId:orderId}});
   return {refund,paymentId:order.providerPaymentId};
  });
  try{
   const p=await gateway.createRefund(claim.paymentId,claim.refund.amountPaise,claim.refund.id);
   const confirmed=await gateway.fetchRefund(claim.paymentId,p.id);
   if(confirmed.id!==p.id)throw new HttpError(409,'Refund reference mismatch.');
   res.status(201).json(await record(claim.refund.id,orderId,claim.paymentId,claim.refund.amountPaise,confirmed,actorId));
  }catch{await db.refund.updateMany({where:{id:claim.refund.id,status:'CREATING'},data:{status:'REVIEW'}});throw new HttpError(502,'Refund requires reconciliation in the test provider dashboard. Do not submit a duplicate.');}
 }));
 router.post('/:orderId/reconcile',wrap(async(req,res)=>{
  if(!gateway?.fetchRefund)throw new HttpError(503,'Test refund provider is not configured.');
  const orderId=uuid.parse(req.params.orderId),{refundId}=z.object({refundId:providerId}).strict().parse(req.body);
  const row=await db.refund.findUnique({where:{orderId},include:{order:true}});if(!row?.order.providerPaymentId)throw new HttpError(404,'Refund request not found.');
  if(row.providerRefundId&&row.providerRefundId!==refundId)throw new HttpError(409,'Refund reference conflict.');
  const p=await gateway.fetchRefund(row.order.providerPaymentId,refundId);
  if(p.id!==refundId)throw new HttpError(409,'Refund reference mismatch.');
  res.json(await record(row.id,orderId,row.order.providerPaymentId,row.amountPaise,p,res.locals.user.id));
 }));
 return router;
}
