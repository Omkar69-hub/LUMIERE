import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { wrap,HttpError } from '../../middleware/http.js';
import { publicUser,requireUser } from '../auth/session.js';
export const users=Router();
users.use(requireUser);
users.get('/me',(_req,res)=>res.json({user:res.locals.user}));
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
