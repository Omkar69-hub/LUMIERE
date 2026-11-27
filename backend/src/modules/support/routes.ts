import {Router} from 'express';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import {db} from '../../config/database.js';
import {wrap,HttpError} from '../../middleware/http.js';
import {requireUser,requireAdmin,requireCustomer} from '../auth/session.js';
const paging=z.object({page:z.coerce.number().int().min(1).max(10000).default(1)}).strict();
export const support=Router();support.use(requireUser,requireCustomer);
support.get('/',wrap(async(req,res)=>{const {page}=paging.parse(req.query);const rows=await db.supportTicket.findMany({where:{userId:res.locals.user.id},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:21});res.json({items:rows.slice(0,20),hasMore:rows.length>20});}));
support.post('/',rateLimit({windowMs:600000,limit:5,standardHeaders:'draft-7',legacyHeaders:false}),wrap(async(req,res)=>{
 const data=z.object({subject:z.string().trim().min(3).max(120),message:z.string().trim().min(10).max(2000)}).strict().parse(req.body);
 const userId:string=res.locals.user.id;const row=await db.$transaction(async tx=>{
  await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  if(await tx.supportTicket.count({where:{userId,status:'OPEN'}})>=5)throw new HttpError(409,'Please wait for existing open requests to be answered.');
  return tx.supportTicket.create({data:{userId,...data}});
 });res.status(201).json(row);
}));
export const adminSupport=Router();adminSupport.use(requireUser,requireAdmin);
adminSupport.get('/',wrap(async(req,res)=>{const {page,status}=paging.extend({status:z.enum(['OPEN','ANSWERED','CLOSED']).optional()}).parse(req.query);const rows=await db.supportTicket.findMany({where:{status},include:{user:{select:{name:true,email:true}}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:21});res.json({items:rows.slice(0,20),hasMore:rows.length>20});}));
adminSupport.patch('/:id',wrap(async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id),v=z.object({status:z.enum(['ANSWERED','CLOSED']),response:z.string().trim().min(3).max(2000)}).strict().parse(req.body);
 await db.$transaction(async tx=>{const row=await tx.supportTicket.updateMany({where:{id,status:{in:v.status==='ANSWERED'?['OPEN']:['OPEN','ANSWERED']}},data:v});if(!row.count)throw new HttpError(409,'Ticket is missing or already resolved.');await tx.adminEvent.create({data:{actorId:res.locals.user.id,action:'SUPPORT_'+v.status,targetId:id}});});res.json({message:'Support request updated.'});
}));
