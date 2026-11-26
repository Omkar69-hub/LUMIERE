import {Router} from 'express';
import {z} from 'zod';
import {db} from '../../config/database.js';
import {wrap,HttpError} from '../../middleware/http.js';
import {requireUser,requireAdmin} from '../auth/session.js';
import {couponCode} from './coupons.js';
const uuid=z.string().uuid();
const coupon=z.object({percent:z.number().int().min(1).max(90),minimumPaise:z.number().int().min(0).max(2000000000),active:z.boolean(),expiresAt:z.iso.datetime().nullable()}).strict();
export const adminCommerce=Router();adminCommerce.use(requireUser,requireAdmin);
adminCommerce.get('/coupons',wrap(async(req,res)=>{const {page}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1)}).strict().parse(req.query);const items=await db.coupon.findMany({orderBy:{code:'asc'},skip:(page-1)*25,take:26});res.json({items:items.slice(0,25),hasMore:items.length>25});}));
adminCommerce.put('/coupons/:code',wrap(async(req,res)=>{
 const code=couponCode.parse(req.params.code),v=coupon.parse(req.body),data={...v,expiresAt:v.expiresAt?new Date(v.expiresAt):null};
 if(data.active&&data.expiresAt&&data.expiresAt<=new Date())throw new HttpError(400,'Active coupon must not be expired.');
 const result=await db.$transaction(async tx=>{const c=await tx.coupon.upsert({where:{code},create:{code,...data},update:data});await tx.adminEvent.create({data:{actorId:res.locals.user.id,action:'COUPON_UPDATE',targetId:code}});return c;});res.json(result);
}));
adminCommerce.get('/returns',wrap(async(req,res)=>{
 const {page,status}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),status:z.enum(['REQUESTED','APPROVED','REJECTED','RECEIVED']).optional()}).strict().parse(req.query);
 const rows=await db.returnRequest.findMany({where:{status},include:{order:{select:{id:true,totalPaise:true,paymentMethod:true,user:{select:{name:true,email:true}}}}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*25,take:26});res.json({items:rows.slice(0,25),hasMore:rows.length>25});
}));
adminCommerce.patch('/returns/:id',wrap(async(req,res)=>{
 const id=uuid.parse(req.params.id),v=z.object({status:z.enum(['APPROVED','REJECTED','RECEIVED']),reviewNote:z.string().trim().min(1).max(500)}).strict().parse(req.body);
 const prior=v.status==='RECEIVED'?'APPROVED':'REQUESTED';
 await db.$transaction(async tx=>{const changed=await tx.returnRequest.updateMany({where:{id,status:prior},data:v});if(!changed.count)throw new HttpError(409,'Return status cannot make that transition.');await tx.adminEvent.create({data:{actorId:res.locals.user.id,action:'RETURN_'+v.status,targetId:id}});});res.json({message:'Return status updated. No refund or stock adjustment was made.'});
}));
export const customerReturns=Router();customerReturns.use(requireUser);
customerReturns.get('/:orderId',wrap(async(req,res)=>{
 const orderId=uuid.parse(req.params.orderId);
 const order=await db.order.findFirst({where:{id:orderId,userId:res.locals.user.id},select:{id:true,returnRequest:true,refund:{select:{status:true,amountPaise:true}}}});if(!order)throw new HttpError(404,'Order not found.');
 res.json({request:order.returnRequest,refund:order.refund});
}));
customerReturns.post('/:orderId',wrap(async(req,res)=>{
 const orderId=uuid.parse(req.params.orderId),{reason}=z.object({reason:z.string().trim().min(5).max(500)}).strict().parse(req.body);
 const result=await db.$transaction(async tx=>{
  const order=await tx.order.findFirst({where:{id:orderId,userId:res.locals.user.id,status:'PAID',fulfillment:'DELIVERED'},select:{id:true}});if(!order)throw new HttpError(409,'Only delivered, paid orders can request a return.');
  return tx.returnRequest.create({data:{orderId,reason}});
 });res.status(201).json(result);
}));
