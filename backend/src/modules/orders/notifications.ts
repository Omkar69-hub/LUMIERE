import nodemailer from 'nodemailer';
import {renderOrderEmail} from './email-template.js';
import {db} from '../../config/database.js';
import type {Prisma} from '../../generated/prisma/client.js';
type Event='CONFIRMED'|'PACKING'|'SHIPPED'|'OUT_FOR_DELIVERY'|'DELIVERED'|'CANCELLED';
export const whatsappTestAvailable=()=>process.env.NODE_ENV!=='production'&&process.env.ORDER_WHATSAPP_TEST_ENABLED==='true'&&!!process.env.WHATSAPP_TEST_RECIPIENT;
export async function queueOrderNotice(tx:Prisma.TransactionClient,orderId:string,event:Event){
 const o=await tx.order.findUniqueOrThrow({where:{id:orderId},select:{whatsappNumber:true}});
 await tx.orderNotification.createMany({data:[{orderId,event,channel:'EMAIL'},...(o.whatsappNumber?[{orderId,event,channel:'WHATSAPP' as const}]:[])],skipDuplicates:true});
}
const currency=(n:number)=>'INR '+(n/100).toFixed(2);
export function startOrderNotificationWorker(origin:string){
 // Explicit local test only. Never send to arbitrary customers or charge a live provider.
 if(process.env.NODE_ENV==='production')return;
 const emailOn=process.env.ORDER_EMAIL_TEST_ENABLED==='true'&&!!process.env.ORDER_EMAIL_TEST_RECIPIENT&&!!process.env.SMTP_HOST&&!!process.env.SMTP_USER&&!!process.env.SMTP_PASS&&!!process.env.SMTP_FROM;
 const waOn=whatsappTestAvailable()&&!!process.env.WHATSAPP_TOKEN&&/^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID||'')&&/^v\d+\.\d+$/.test(process.env.WHATSAPP_API_VERSION||'');
 if(!emailOn&&!waOn)return;
 const port=Number(process.env.SMTP_PORT||587);
 const transport=emailOn?nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}):null;
 const channels:('EMAIL'|'WHATSAPP')[]=[];if(emailOn)channels.push('EMAIL');if(waOn)channels.push('WHATSAPP');
 let busy=false;
 async function tick(){
  if(busy)return;busy=true;
  try{
   await db.orderNotification.updateMany({where:{status:'SENDING',updatedAt:{lt:new Date(Date.now()-300000)},channel:{in:channels}},data:{status:'REVIEW'}});
   const rows=await db.orderNotification.findMany({where:{status:'PENDING',channel:{in:channels}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:20});
   for(const row of rows){
    const claim=await db.orderNotification.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'SENDING'}});if(!claim.count)continue;
    try{
     const o=await db.order.findUniqueOrThrow({where:{id:row.orderId},include:{user:true,items:{include:{variant:{include:{product:{include:{images:{orderBy:{position:'asc'},take:1}}}}}}}}});
     const ref=o.id.slice(0,8),tracking=o.trackingNumber?'Courier: '+o.carrier+'; tracking number: '+o.trackingNumber:'Tracking details not yet available';
     const detail=row.event==='CONFIRMED'?currency(o.totalPaise)+'; '+(o.paymentMethod==='COD'?'Cash on Delivery':'Online test payment confirmed'):row.event==='SHIPPED'||row.event==='OUT_FOR_DELIVERY'?tracking:row.event==='DELIVERED'?'Thank you for shopping with LUMIÈRE.':row.event==='PACKING'?'Your items are being prepared.':'Your order was cancelled.';
     if(row.channel==='EMAIL'){
      if(!o.user.emailVerifiedAt||o.user.email.toLowerCase()!==process.env.ORDER_EMAIL_TEST_RECIPIENT?.trim().toLowerCase()){await db.orderNotification.update({where:{id:row.id},data:{status:'SKIPPED'}});continue;}
      const email=renderOrderEmail({event:row.event,orderId:o.id,customerName:o.user.name,paymentMethod:o.paymentMethod,subtotalPaise:o.subtotalPaise,shippingPaise:o.shippingPaise,discountPaise:o.discountPaise,totalPaise:o.totalPaise,carrier:o.carrier,trackingNumber:o.trackingNumber,origin,cloudName:process.env.CLOUDINARY_CLOUD_NAME,items:o.items.map(i=>({name:i.name,size:i.size,color:i.color,quantity:i.quantity,unitPricePaise:i.unitPricePaise,imageUrl:i.variant.product.images[0]?.url}))});
      await transport!.sendMail({from:process.env.SMTP_FROM,to:o.user.email,...email});
     }else{
      if(!o.whatsappNumber||o.whatsappNumber!==process.env.WHATSAPP_TEST_RECIPIENT){await db.orderNotification.update({where:{id:row.id},data:{status:'SKIPPED'}});continue;}
      const template=process.env['WHATSAPP_TEMPLATE_'+row.event];
      if(!template||! /^[a-z0-9_]+$/.test(template))throw Error('Template not configured');
      const result=await fetch('https://graph.facebook.com/'+process.env.WHATSAPP_API_VERSION+'/'+process.env.WHATSAPP_PHONE_NUMBER_ID+'/messages',{method:'POST',headers:{Authorization:'Bearer '+process.env.WHATSAPP_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:o.whatsappNumber.slice(1),type:'template',template:{name:template,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'en'},components:[{type:'body',parameters:[{type:'text',text:ref},{type:'text',text:detail.replace(/\s+/g,' ').slice(0,500)}]}]}}),signal:AbortSignal.timeout(20000)});
      if(!result.ok)throw Error('Provider rejected message');
      const response=await result.json() as {messages?:{id?:string}[]};if(!response.messages?.[0]?.id)throw Error('Provider acceptance not confirmed');
     }
     await db.orderNotification.update({where:{id:row.id},data:{status:'ACCEPTED'}});
    }catch{await db.orderNotification.updateMany({where:{id:row.id,status:'SENDING'},data:{status:'REVIEW'}});}
   }
  }catch{console.error('Order notification queue requires review.');}finally{busy=false;}
 }
 const timer=setInterval(()=>void tick(),5000);timer.unref();void tick();
}
