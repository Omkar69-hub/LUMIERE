import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { wrap,HttpError } from '../../middleware/http.js';
import { requireUser } from '../auth/session.js';
const uuid=z.string().uuid();
const qty=z.number().int().min(1).max(20);
const itemSchema=z.object({variantId:uuid,quantity:qty}).strict();
const include={variant:{include:{product:{include:{images:{orderBy:{position:'asc' as const},take:1}}}}}};
export const cart=Router();cart.use(requireUser);
cart.get('/',wrap(async(_req,res)=>{
 const rows=await db.cartItem.findMany({where:{userId:res.locals.user.id},include,orderBy:{createdAt:'asc'}});
 const items=rows.map(row=>{const v=row.variant,p=v.product;const available=p.published&&v.stock>=row.quantity;return {id:row.id,variantId:v.id,slug:p.slug,name:p.name,size:v.size,color:v.color,sku:v.sku,quantity:row.quantity,pricePaise:p.pricePaise,lineTotalPaise:p.pricePaise*row.quantity,available,published:p.published,maxQuantity:p.published?Math.min(20,v.stock):0,image:p.images[0]?{url:p.images[0].url,alt:p.images[0].alt}:null};});
 res.json({items,subtotalPaise:items.reduce((sum,i)=>sum+(i.available?i.lineTotalPaise:0),0),currency:'INR',allAvailable:items.every(i=>i.available)});
}));
async function checkVariant(variantId:string,quantity:number){
 const row=await db.productVariant.findUnique({where:{id:variantId},include:{product:{select:{published:true}}}});
 if(!row?.product.published)throw new HttpError(404,'Product unavailable.');
 if(row.stock<quantity)throw new HttpError(409,'Requested quantity is not in stock.');
}
cart.put('/items',wrap(async(req,res)=>{
 const {variantId,quantity}=itemSchema.parse(req.body),userId=res.locals.user.id;
 await checkVariant(variantId,quantity);
 const item=await db.cartItem.upsert({where:{userId_variantId:{userId,variantId}},create:{userId,variantId,quantity},update:{quantity}});
 res.json({id:item.id,quantity:item.quantity});
}));
cart.patch('/items/:id',wrap(async(req,res)=>{
 const id=uuid.parse(req.params.id),{quantity}=z.object({quantity:qty}).strict().parse(req.body),userId=res.locals.user.id;
 const item=await db.cartItem.findFirst({where:{id,userId}});
 if(!item)throw new HttpError(404,'Cart item not found.');
 await checkVariant(item.variantId,quantity);
 const result=await db.cartItem.updateMany({where:{id,userId},data:{quantity}});if(!result.count)throw new HttpError(404,'Cart item not found.');
 res.json({id,quantity});
}));
cart.delete('/items/:id',wrap(async(req,res)=>{
 const id=uuid.parse(req.params.id),result=await db.cartItem.deleteMany({where:{id,userId:res.locals.user.id}});
 if(!result.count)throw new HttpError(404,'Cart item not found.');res.status(204).end();
}));
export const wishlist=Router();wishlist.use(requireUser);
wishlist.get('/',wrap(async(_req,res)=>{
 const rows=await db.wishlistItem.findMany({where:{userId:res.locals.user.id,product:{published:true}},include:{product:{include:{images:{orderBy:{position:'asc'},take:1}}}},orderBy:{createdAt:'desc'}});
 res.json(rows.map(({product:p})=>({id:p.id,slug:p.slug,name:p.name,pricePaise:p.pricePaise,image:p.images[0]?{url:p.images[0].url,alt:p.images[0].alt}:null})));
}));
wishlist.put('/items/:productId',wrap(async(req,res)=>{
 const productId=uuid.parse(req.params.productId),userId=res.locals.user.id;
 const p=await db.product.findFirst({where:{id:productId,published:true},select:{id:true}});
 if(!p)throw new HttpError(404,'Product unavailable.');
 await db.wishlistItem.upsert({where:{userId_productId:{userId,productId}},create:{userId,productId},update:{}});
 res.status(204).end();
}));
wishlist.delete('/items/:productId',wrap(async(req,res)=>{
 const productId=uuid.parse(req.params.productId);
 await db.wishlistItem.deleteMany({where:{userId:res.locals.user.id,productId}});res.status(204).end();
}));
