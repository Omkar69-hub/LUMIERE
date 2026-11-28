import PDFDocument from 'pdfkit';
import type {Response} from 'express';
import {HttpError} from '../../middleware/http.js';
export type DocumentKind='summary'|'shipping-label'|'packing-slip';
type DocumentOrder={
 id:string;createdAt:Date;addressSnapshot:unknown;status:string;paymentMethod:string;fulfillment:string;
 trackingNumber:string|null;carrier:string|null;subtotalPaise:number;shippingPaise:number;discountPaise:number;couponCode:string|null;totalPaise:number;
 items:{name:string;sku:string;size:string;color:string;quantity:number;unitPricePaise:number}[];
 refund:{status:string;amountPaise:number}|null;
};
const title={summary:'Order summary','shipping-label':'Shipping label','packing-slip':'Packing slip'} as const;
const ink='#171717',gold='#80694F',muted='#655F58',pale='#EEE8DD';
const amount=(p:number)=>'INR '+(p/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=(d:Date)=>d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
// Standard PDF fonts support Latin text; fail explicitly rather than silently corrupt a name/address.
function safe(value:unknown){
 if(typeof value!=='string')return '';
 const s=value.normalize('NFC').replace(/[\r\n\t]+/g,' ').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').trim();
 if(/[^\x20-\x7e\u00a0-\u00ff]/.test(s))throw new HttpError(422,'This test PDF supports Latin-script text only. No address or item details have been changed.');
 return s;
}
function snapshot(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
export function canPrepareShipment(o:Pick<DocumentOrder,'status'|'paymentMethod'|'fulfillment'>){
 return (o.status==='PAID'||(o.status==='PENDING_PAYMENT'&&o.paymentMethod==='COD'))&&['UNFULFILLED','PACKING','SHIPPED','OUT_FOR_DELIVERY'].includes(o.fulfillment);
}
export function renderOrderDocument(o:DocumentOrder,kind:DocumentKind):Promise<Buffer>{
 if(process.env.NODE_ENV==='production')throw new HttpError(404,'Test documents are unavailable.');
 if(kind!=='summary'&&!canPrepareShipment(o))throw new HttpError(409,'Shipping documents are available only for active confirmed test orders.');
 const address=snapshot(o.addressSnapshot),recipient=safe(address.recipient),street=safe(address.line1),locality=[safe(address.city),safe(address.state),safe(address.postalCode)].filter(Boolean).join(', '),country=safe(address.country);
 if(kind!=='summary'&&(!recipient||!street||!safe(address.city)||!safe(address.state)||!safe(address.postalCode)||!country||!o.items.length))throw new HttpError(422,'A complete saved delivery address and order items are required.');
 const label=kind==='shipping-label',margin=label?18:44;
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:label?[288,432]:'A4',margin,bufferPages:true,compress:false,info:{Title:'LUMIERE '+title[kind],Author:'LUMIERE',Subject:'Development test only'}});
  const chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
  try{
   const width=()=>doc.page.width-margin*2;
   const bottom=()=>doc.page.height-margin-22;
   const line=(s:string,size=10,color=ink,font='Helvetica')=>{doc.font(font).fontSize(size).fillColor(color).text(s,margin,doc.y,{width:width(),lineGap:2});};
   const rule=()=>{doc.moveDown(.35);doc.strokeColor(pale).lineWidth(.8).moveTo(margin,doc.y).lineTo(doc.page.width-margin,doc.y).stroke();doc.moveDown(.6);};
   const heading=(s:string)=>{doc.moveDown(.35);line(s,11,gold,'Helvetica-Bold');doc.moveDown(.3);};
   const banner=()=>{doc.rect(margin,margin,width(),label?42:62).fill(ink);doc.font('Times-Roman').fontSize(label?20:27).fillColor('#FFFFFF').text('LUMIÈRE',margin+12,margin+8,{width:width()-24,lineBreak:false});doc.font('Helvetica').fontSize(8).fillColor('#E4C9A0').text('DEVELOPMENT / TEST ONLY',margin+12,margin+(label?30:43),{width:width()-24,lineBreak:false});doc.y=margin+(label?53:76);line(title[kind],label?17:24,ink,'Times-Roman');line('Order '+o.id,label?8:9,muted);line('Placed '+date(o.createdAt),9,muted);rule();};
   const ensure=(height:number)=>{if(doc.y+height<=bottom())return;if(label)throw new HttpError(422,'Address or tracking details are too long for a 4 x 6 test label. Use the order summary instead.');doc.addPage();banner();line('Continued',9,muted);};
   const textBlock=(s:string,size=10,font='Helvetica')=>{doc.font(font).fontSize(size);ensure(doc.heightOfString(s,{width:width(),lineGap:2})+6);line(s,size,ink,font);};
   const payment=o.status==='CANCELLED'?'Cancelled - do not collect':o.status==='PAID'?'Paid (test)':o.paymentMethod==='COD'?'Payable on delivery (test)':'Awaiting payment';
   banner();
   heading('DELIVER TO');for(const s of [recipient,street,locality,country].filter(Boolean))textBlock(s,label?10:11);
   if(!recipient)line('Saved address unavailable',9,muted);
   rule();
   if(label){
    heading('SHIPMENT');textBlock('Carrier: '+(safe(o.carrier)||'Not assigned'),10);textBlock('Tracking: '+(safe(o.trackingNumber)||'Not assigned'),10);
    textBlock('Items: '+o.items.reduce((sum,i)=>sum+i.quantity,0),10);
    textBlock(o.paymentMethod==='COD'&&o.status==='PENDING_PAYMENT'?'Test COD amount: '+amount(o.totalPaise):'Payment: '+payment,11,'Helvetica-Bold');
    rule();textBlock('NOT A CARRIER LABEL - DO NOT SHIP',9,'Helvetica-Bold');
   }else{
    heading('ORDER STATUS');textBlock('Payment method: '+(o.paymentMethod==='COD'?'Cash on Delivery':'Online (test)'));textBlock('Payment: '+payment);textBlock('Fulfillment: '+(o.status==='CANCELLED'?'Cancelled':o.fulfillment.replaceAll('_',' ')));
    if(o.carrier||o.trackingNumber)textBlock('Carrier: '+(safe(o.carrier)||'Not assigned')+' | Tracking: '+(safe(o.trackingNumber)||'Not assigned'));
    const estimate=snapshot(address.shippingEstimate);if(typeof estimate.earliestDate==='string'&&typeof estimate.latestDate==='string')textBlock('Original simulated delivery: '+safe(estimate.earliestDate)+' to '+safe(estimate.latestDate));
    if(o.refund)textBlock('Refund: '+o.refund.status+' (test) - '+amount(o.refund.amountPaise));
    rule();heading(kind==='packing-slip'?'PACKING CHECKLIST':'ORDERED ITEMS');
    for(const i of o.items){
     const name=safe(i.name),details='SKU: '+safe(i.sku)+' | Size: '+safe(i.size)+' | Colour: '+safe(i.color);
     const price=kind==='summary'?'Quantity: '+i.quantity+' | Unit: '+amount(i.unitPricePaise)+' | Line: '+amount(i.unitPricePaise*i.quantity):'[ ] Pack quantity: '+i.quantity;
     doc.font('Helvetica-Bold').fontSize(11);const nameHeight=doc.heightOfString(name,{width:width(),lineGap:2});doc.font('Helvetica').fontSize(10);const rowHeight=nameHeight+doc.heightOfString(details,{width:width(),lineGap:2})+doc.heightOfString(price,{width:width(),lineGap:2})+25;ensure(rowHeight);
     line(name,11,ink,'Helvetica-Bold');line(details,10,muted);line(price);rule();
    }
    if(!o.items.length)line('No item records available.',10,muted);
    if(kind==='summary'){
     ensure(125);heading('PAYMENT BREAKDOWN');
     line('Subtotal: '+amount(o.subtotalPaise));line('Test shipping: '+amount(o.shippingPaise));line('Discount'+(o.couponCode?' ('+safe(o.couponCode)+')':'')+': '+amount(o.discountPaise));line('Original order total: '+amount(o.totalPaise),14,ink,'Helvetica-Bold');
     if(o.refund?.status==='PROCESSED')line('Processed test refund: '+amount(o.refund.amountPaise),10,muted);
     line('Not a tax invoice or proof of real payment.',10,muted);
    }else{textBlock('Total units to check: '+o.items.reduce((sum,i)=>sum+i.quantity,0),12,'Helvetica-Bold');textBlock('Internal test packing checklist. No actual dispatch.');}
   }
   const range=doc.bufferedPageRange();if(label&&range.count!==1)throw new HttpError(422,'Details do not fit a single test shipping label.');
   for(let n=0;n<range.count;n++){doc.switchToPage(range.start+n);doc.font('Helvetica').fontSize(8).fillColor(muted).text('TEST ONLY / '+(n+1)+' of '+range.count,margin,doc.page.height-margin-12,{width:width(),align:'right',lineBreak:false});}
   doc.end();
  }catch(e){doc.destroy();reject(e);}
 });
}
export async function sendOrderDocument(res:Response,o:DocumentOrder,kind:DocumentKind){
 const pdf=await renderOrderDocument(o,kind);
 res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="lumiere-'+kind+'-'+o.id+'.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(pdf);
}
