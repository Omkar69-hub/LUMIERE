import {Router} from 'express';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import {db} from '../../config/database.js';
import {wrap,HttpError} from '../../middleware/http.js';
import {requireUser,requireAdmin} from '../auth/session.js';
const defaults={announcement:'Discover the LUMIÈRE edit',headline:'A quieter kind of luxury.',description:'Considered essentials. An enduring point of view.',imageUrl:null,imageAlt:null};
const schema=z.object({announcement:z.string().trim().min(1).max(140),headline:z.string().trim().min(1).max(120),description:z.string().trim().min(1).max(300),imageUrl:z.string().url().max(2048).refine(v=>new URL(v).protocol==='https:').nullable(),imageAlt:z.string().trim().min(1).max(250).nullable()}).strict().refine(v=>!!v.imageUrl===!!v.imageAlt,{message:'An image and alt text must be supplied together.'});
export const marketing=Router();
marketing.get('/campaign',wrap(async(_req,res)=>res.json(await db.storeCampaign.findUnique({where:{id:'home'}})??defaults)));
marketing.post('/newsletter',rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Please try again later.'}}),wrap(async(req,res)=>{
 const {email}=z.object({email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),consent:z.literal(true)}).strict().parse(req.body);
 await db.newsletterSubscriber.upsert({where:{email},create:{email},update:{}});
 res.status(202).json({message:'Your request to join the mailing list has been recorded. Campaign emails are not yet enabled.'});
}));
export const adminMarketing=Router();adminMarketing.use(requireUser,requireAdmin);
adminMarketing.get('/campaign',wrap(async(_req,res)=>res.json(await db.storeCampaign.findUnique({where:{id:'home'}})??defaults)));
adminMarketing.put('/campaign',wrap(async(req,res)=>{
 const data=schema.parse(req.body);
 const result=await db.$transaction(async tx=>{const row=await tx.storeCampaign.upsert({where:{id:'home'},create:{id:'home',...data},update:data});await tx.adminEvent.create({data:{actorId:res.locals.user.id,action:'CAMPAIGN_UPDATE',targetId:'home'}});return row;});res.json(result);
}));
adminMarketing.get('/products',wrap(async(req,res)=>{
 const {page}=z.object({page:z.coerce.number().int().min(1).max(1000).default(1)}).strict().parse(req.query);
 const rows=await db.product.findMany({select:{id:true,name:true,published:true,featured:true},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*25,take:26});res.json({items:rows.slice(0,25),hasMore:rows.length>25});
}));
adminMarketing.patch('/products/:id',wrap(async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id),{featured}=z.object({featured:z.boolean()}).strict().parse(req.body);
 await db.$transaction(async tx=>{const updated=await tx.product.updateMany({where:{id,...(featured?{published:true}:{})},data:{featured}});if(!updated.count)throw new HttpError(409,'Product not found or unpublished.');await tx.adminEvent.create({data:{actorId:res.locals.user.id,action:featured?'PRODUCT_FEATURE':'PRODUCT_UNFEATURE',targetId:id}});});res.json({message:'Collection updated.'});
}));
adminMarketing.get('/newsletter',wrap(async(_req,res)=>res.json({subscribers:await db.newsletterSubscriber.count(),deliveryEnabled:false})));
