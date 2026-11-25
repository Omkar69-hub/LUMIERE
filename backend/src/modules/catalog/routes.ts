import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { db } from '../../config/database.js';
import { wrap,HttpError } from '../../middleware/http.js';
import { requireUser,requireAdmin } from '../auth/session.js';

const slug=z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const name=z.string().trim().min(1).max(100);
const uuid=z.string().uuid();
const variant=z.object({sku:z.string().trim().min(1).max(80),size:name,color:name,stock:z.number().int().min(0).max(1000000)}).strict();
const product=z.object({slug,name,description:z.string().trim().min(1).max(4000),pricePaise:z.number().int().min(1).max(100000000),categoryId:uuid,brandId:uuid,images:z.array(z.object({url:z.string().url().max(2048).refine(v=>new URL(v).protocol==='https:','HTTPS images required'),alt:z.string().trim().min(1).max(250)}).strict()).max(12),variants:z.array(variant).min(1).max(100)}).strict();
const listQuery=z.object({q:z.string().trim().max(100).optional(),category:slug.optional(),brand:slug.optional(),size:name.optional(),color:name.optional(),minPrice:z.coerce.number().int().min(0).max(100000000).optional(),maxPrice:z.coerce.number().int().min(0).max(100000000).optional(),inStock:z.enum(['true','false']).optional(),featured:z.enum(['true','false']).optional(),sort:z.enum(['new','price-asc','price-desc']).default('new'),page:z.coerce.number().int().min(1).max(1000).default(1),limit:z.coerce.number().int().min(1).max(48).default(12)}).strict().refine(v=>v.minPrice===undefined||v.maxPrice===undefined||v.minPrice<=v.maxPrice,{message:'Minimum price exceeds maximum.'});
const include={category:{select:{name:true,slug:true}},brand:{select:{name:true,slug:true}},images:{orderBy:{position:'asc'}},variants:{orderBy:[{size:'asc'},{color:'asc'}]}} satisfies Prisma.ProductInclude;
type Row=Prisma.ProductGetPayload<{include:typeof include}>;
const publicProduct=(p:Row)=>({id:p.id,slug:p.slug,name:p.name,description:p.description,pricePaise:p.pricePaise,category:p.category,brand:p.brand,images:p.images.map(({url,alt})=>({url,alt})),variants:p.variants.map(({id,sku,size,color,stock})=>({id,sku,size,color,available:stock>0})),createdAt:p.createdAt});
export const catalog=Router();
catalog.get('/categories',wrap(async(_req,res)=>res.json(await db.category.findMany({select:{name:true,slug:true},orderBy:{name:'asc'}}))));
catalog.get('/brands',wrap(async(_req,res)=>res.json(await db.brand.findMany({select:{name:true,slug:true},orderBy:{name:'asc'}}))));
catalog.get('/products',wrap(async(req,res)=>{
  const v=listQuery.parse(req.query);
  const matching:Prisma.ProductVariantWhereInput={...(v.size?{size:{equals:v.size,mode:'insensitive'}}:{}),...(v.color?{color:{equals:v.color,mode:'insensitive'}}:{})};
  const where:Prisma.ProductWhereInput={published:true,...(v.featured==='true'?{featured:true}:v.featured==='false'?{featured:false}:{}),...(v.q?{OR:[{name:{contains:v.q,mode:'insensitive'}},{description:{contains:v.q,mode:'insensitive'}}]}:{}),...(v.category?{category:{slug:v.category}}:{}),...(v.brand?{brand:{slug:v.brand}}:{}),...(v.minPrice!==undefined||v.maxPrice!==undefined?{pricePaise:{gte:v.minPrice,lte:v.maxPrice}}:{}),...(v.inStock==='true'?{variants:{some:{...matching,stock:{gt:0}}}}:v.inStock==='false'?{AND:[{variants:{some:matching}},{variants:{none:{...matching,stock:{gt:0}}}}]}:v.size||v.color?{variants:{some:matching}}:{})};
  const orderBy:Prisma.ProductOrderByWithRelationInput[]=v.sort==='new'?[{createdAt:'desc'},{id:'asc'}]:[{pricePaise:v.sort==='price-asc'?'asc':'desc'},{id:'asc'}];
  const [rows,total]=await db.$transaction([db.product.findMany({where,include,orderBy,skip:(v.page-1)*v.limit,take:v.limit}),db.product.count({where})],{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
  res.json({items:rows.map(publicProduct),total,page:v.page,limit:v.limit});
}));
catalog.get('/products/:slug',wrap(async(req,res)=>{
  const row=await db.product.findFirst({where:{slug:slug.parse(req.params.slug),published:true},include});
  if(!row)throw new HttpError(404,'Product not found.');res.json(publicProduct(row));
}));
export const adminCatalog=Router();
adminCatalog.use(requireUser,requireAdmin);
const taxonomy=z.object({name,slug}).strict();
adminCatalog.get('/categories',wrap(async(_req,res)=>res.json(await db.category.findMany({orderBy:{name:'asc'},include:{_count:{select:{products:true}}}}))));
adminCatalog.get('/brands',wrap(async(_req,res)=>res.json(await db.brand.findMany({orderBy:{name:'asc'},include:{_count:{select:{products:true}}}}))));
adminCatalog.patch('/categories/:id',wrap(async(req,res)=>{const id=uuid.parse(req.params.id);const result=await db.category.updateMany({where:{id},data:taxonomy.parse(req.body)});if(!result.count)throw new HttpError(404,'Category not found.');res.json({message:'Category updated.'});}));
adminCatalog.patch('/brands/:id',wrap(async(req,res)=>{const id=uuid.parse(req.params.id);const result=await db.brand.updateMany({where:{id},data:taxonomy.parse(req.body)});if(!result.count)throw new HttpError(404,'Brand not found.');res.json({message:'Brand updated.'});}));
adminCatalog.delete('/categories/:id',wrap(async(req,res)=>{const result=await db.category.deleteMany({where:{id:uuid.parse(req.params.id),products:{none:{}}}});if(!result.count)throw new HttpError(409,'Category missing or in use.');res.status(204).end();}));
adminCatalog.delete('/brands/:id',wrap(async(req,res)=>{const result=await db.brand.deleteMany({where:{id:uuid.parse(req.params.id),products:{none:{}}}});if(!result.count)throw new HttpError(409,'Brand missing or in use.');res.status(204).end();}));
adminCatalog.post('/categories',wrap(async(req,res)=>res.status(201).json(await db.category.create({data:taxonomy.parse(req.body)}))));
adminCatalog.post('/brands',wrap(async(req,res)=>res.status(201).json(await db.brand.create({data:taxonomy.parse(req.body)}))));
adminCatalog.get('/products',wrap(async(req,res)=>{const v=z.object({page:z.coerce.number().int().min(1).max(1000).default(1)}).strict().parse(req.query);res.json(await db.product.findMany({include,orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(v.page-1)*25}));}));
adminCatalog.post('/products',wrap(async(req,res)=>{
  const {images,variants,...data}=product.parse(req.body);
  const [category,brand]=await Promise.all([db.category.findUnique({where:{id:data.categoryId}}),db.brand.findUnique({where:{id:data.brandId}})]);
  if(!category||!brand)throw new HttpError(400,'Unknown category or brand.');
  res.status(201).json(await db.product.create({data:{...data,images:{create:images.map((img,position)=>({...img,position}))},variants:{create:variants}},include}));
}));
adminCatalog.patch('/products/:id',wrap(async(req,res)=>{
  const id=uuid.parse(req.params.id);
  const data=z.object({name:name.optional(),description:z.string().trim().min(1).max(4000).optional(),pricePaise:z.number().int().min(1).max(100000000).optional(),published:z.boolean().optional(),categoryId:uuid.optional(),brandId:uuid.optional()}).strict().parse(req.body);
  const row=await db.product.findUnique({where:{id},include:{_count:{select:{images:true,variants:true}}}});
  if(!row)throw new HttpError(404,'Product not found.');
  if(data.published&&(row._count.images===0||row._count.variants===0))throw new HttpError(400,'A product needs imagery and variants before publication.');
  if(data.categoryId&&!(await db.category.findUnique({where:{id:data.categoryId}})))throw new HttpError(400,'Unknown category.');
  if(data.brandId&&!(await db.brand.findUnique({where:{id:data.brandId}})))throw new HttpError(400,'Unknown brand.');
  res.json(await db.product.update({where:{id},data,include}));
}));
adminCatalog.patch('/variants/:id/stock',wrap(async(req,res)=>{
  const id=uuid.parse(req.params.id),data=z.object({stock:z.number().int().min(0).max(1000000),expectedStock:z.number().int().min(0).optional()}).strict().parse(req.body);
  const updated=await db.productVariant.updateMany({where:{id,...(data.expectedStock===undefined?{}:{stock:data.expectedStock})},data:{stock:data.stock}});if(!updated.count)throw new HttpError(409,'Stock changed or variant missing. Refresh and retry.');res.json({message:'Stock updated.'});
}));

adminCatalog.get('/products/:id',wrap(async(req,res)=>{const p=await db.product.findUnique({where:{id:uuid.parse(req.params.id)},include});if(!p)throw new HttpError(404,'Product not found.');res.json(p);}));
adminCatalog.put('/products/:id/images',wrap(async(req,res)=>{
 const id=uuid.parse(req.params.id),images=product.shape.images.parse(req.body);
 await db.$transaction(async tx=>{await tx.$queryRaw `SELECT "id" FROM "Product" WHERE "id" = ${id} FOR UPDATE`;const p=await tx.product.findUnique({where:{id}});if(!p)throw new HttpError(404,'Product not found.');if(p.published&&!images.length)throw new HttpError(409,'Unpublish before removing all images.');await tx.productImage.deleteMany({where:{productId:id}});await tx.productImage.createMany({data:images.map((img,position)=>({...img,productId:id,position}))});});res.json({message:'Images updated.'});
}));
adminCatalog.post('/products/:id/variants',wrap(async(req,res)=>{const productId=uuid.parse(req.params.id),data=variant.parse(req.body);if(!(await db.product.findUnique({where:{id:productId}})))throw new HttpError(404,'Product not found.');res.status(201).json(await db.productVariant.create({data:{...data,productId}}));}));
adminCatalog.delete('/products/:id',wrap(async(req,res)=>{
 const id=uuid.parse(req.params.id);
 // Preserve historical order and cart references. Archive rather than hard delete.
 const result=await db.product.updateMany({where:{id},data:{published:false}});if(!result.count)throw new HttpError(404,'Product not found.');res.json({message:'Product archived (unpublished).'});
}));
