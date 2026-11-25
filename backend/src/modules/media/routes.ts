import {Router,raw} from 'express';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import {requireUser,requireAdmin} from '../auth/session.js';
import {wrap,HttpError} from '../../middleware/http.js';
import {db} from '../../config/database.js';
const limit=5*1024*1024;
const settings=()=>{const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;if(!cloud||!key||!secret||! /^[a-zA-Z0-9_-]+$/.test(cloud))return null;return {cloud,key,secret};};
export function imageType(b:Buffer){
 if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'image/webp';
 return null;
}
export const media=Router();media.use(requireUser,requireAdmin);
media.get('/configuration',(_req,res)=>res.json({enabled:!!settings(),maxBytes:limit}));
media.post('/upload',rateLimit({windowMs:60000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}),raw({type:['image/jpeg','image/png','image/webp'],limit}),wrap(async(req,res)=>{
 const config=settings();if(!config)throw new HttpError(503,'Cloud media storage is not configured.');
 if(!Buffer.isBuffer(req.body)||!req.body.length||req.body.length>limit)throw new HttpError(400,'Upload a JPEG, PNG or WebP image up to 5 MB.');
 const type=imageType(req.body);if(!type||type!==req.get('content-type'))throw new HttpError(400,'Image format does not match the upload.');
 const publicId='lumiere/'+randomUUID(),timestamp=String(Math.floor(Date.now()/1000));
 const params={overwrite:'false',public_id:publicId,timestamp};
 const signed=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('&');
 const signature=createHash('sha256').update(signed+config.secret).digest('hex');
 const body=new FormData();for(const [k,v] of Object.entries(params))body.append(k,v);
 body.append('api_key',config.key);body.append('signature',signature);body.append('file',new Blob([new Uint8Array(req.body)],{type}), 'upload.'+(type==='image/jpeg'?'jpg':type.split('/')[1]));
 const result=await fetch('https://api.cloudinary.com/v1_1/'+config.cloud+'/image/upload',{method:'POST',body,signal:AbortSignal.timeout(20000)});
 if(!result.ok)throw new HttpError(502,'Image provider rejected the upload.');
 const asset=z.object({public_id:z.string(),secure_url:z.string().url(),width:z.number().int().positive(),height:z.number().int().positive(),format:z.enum(['jpg','jpeg','png','webp'])}).parse(await result.json());
 const url=new URL(asset.secure_url);
 if(asset.public_id!==publicId||url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.startsWith('/'+config.cloud+'/image/upload/'))throw new HttpError(502,'Unexpected media provider response.');
 await db.adminEvent.create({data:{actorId:res.locals.user.id,action:'MEDIA_UPLOAD',targetId:publicId}});
 res.status(201).json({url:asset.secure_url,width:asset.width,height:asset.height,publicId});
}));
