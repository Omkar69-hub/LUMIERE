import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { wrap,HttpError } from '../../middleware/http.js';
import { publicUser,requireUser } from '../auth/session.js';
export const users=Router();
users.use(requireUser);
users.get('/me',(_req,res)=>res.json({user:res.locals.user}));
users.get('/me/overview',wrap(async(_req,res)=>{
 const userId:string=res.locals.user.id;
 const [orders,delivered,saved,returns,recent]=await db.$transaction([
  db.order.count({where:{userId}}),
  db.order.count({where:{userId,fulfillment:'DELIVERED',status:'PAID'}}),
  db.wishlistItem.count({where:{userId,product:{published:true}}}),
  db.returnRequest.count({where:{order:{userId}}}),
  db.order.findFirst({where:{userId},orderBy:[{createdAt:'desc'},{id:'asc'}],select:{id:true,createdAt:true,status:true,paymentMethod:true,fulfillment:true,totalPaise:true,items:{orderBy:{id:'asc'},take:1,select:{name:true,size:true,color:true,variant:{select:{product:{select:{images:{orderBy:{position:'asc'},take:1,select:{url:true}}}}}}}},_count:{select:{items:true}}}})
 ]);
 res.json({orders,delivered,saved,returns,recent:recent?{id:recent.id,createdAt:recent.createdAt,status:recent.status,paymentMethod:recent.paymentMethod,fulfillment:recent.fulfillment,totalPaise:recent.totalPaise,itemCount:recent._count.items,item:recent.items[0]?{name:recent.items[0].name,size:recent.items[0].size,color:recent.items[0].color,imageUrl:recent.items[0].variant.product.images[0]?.url??null}:null}:null});
}));
users.get('/me/returns',wrap(async(req,res)=>{
 const {page}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1)}).strict().parse(req.query);
 const rows=await db.returnRequest.findMany({where:{order:{userId:res.locals.user.id}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:21,select:{id:true,orderId:true,status:true,reason:true,reviewNote:true,createdAt:true,order:{select:{refund:{select:{status:true,amountPaise:true}}}}}});
 res.json({items:rows.slice(0,20).map(({order,...row})=>({...row,refund:order.refund})),hasMore:rows.length>20});
}));
users.patch('/me',wrap(async(req,res)=>{
  const data=z.object({name:z.string().trim().min(2).max(100).optional(),mobile:z.string().regex(/^\+?[0-9]{10,15}$/).optional()}).strict().parse(req.body);
  const user=await db.user.update({where:{id:res.locals.user.id},data,select:publicUser});res.json({user});
}));
export const addresses=Router();
addresses.use(requireUser);
const schema=z.object({recipient:z.string().trim().min(2).max(100),line1:z.string().trim().min(3).max(250),city:z.string().trim().min(2).max(100),state:z.string().trim().min(2).max(100),postalCode:z.string().regex(/^[0-9]{6}$/)}).strict();
addresses.get('/',wrap(async(_req,res)=>res.json(await db.address.findMany({where:{userId:res.locals.user.id},orderBy:{createdAt:'desc'}}))));
addresses.post('/',wrap(async(req,res)=>res.status(201).json(await db.address.create({data:{...schema.parse(req.body),userId:res.locals.user.id}}))));
addresses.patch('/:id',wrap(async(req,res)=>{const data=schema.partial().parse(req.body);const result=await db.address.updateMany({where:{id:req.params.id,userId:res.locals.user.id},data});if(!result.count)throw new HttpError(404,'Address not found.');res.json({message:'Updated'});}));
addresses.delete('/:id',wrap(async(req,res)=>{const result=await db.address.deleteMany({where:{id:req.params.id,userId:res.locals.user.id}});if(!result.count)throw new HttpError(404,'Address not found.');res.status(204).end();}));
