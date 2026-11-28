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
// A4 editorial order summary. Measured rows preserve long item names and addresses.
function drawSummary(doc:InstanceType<typeof PDFDocument>,o:DocumentOrder,address:Record<string,unknown>){
 const m=44,w=doc.page.width-2*m,right=m+w,limit=doc.page.height-70;
 const cream='#F6F2EB',border='#DED6C9',bronze='#9A8265';
 const block=(s:string,x:number,y:number,width:number,size=10,font='Helvetica',color=ink,align:'left'|'right'|'center'='left')=>{
  doc.font(font).fontSize(size).fillColor(color).text(s,x,y,{width,align,lineGap:2});
 };
 const height=(s:string,width:number,size=10,font='Helvetica')=>{doc.font(font).fontSize(size);return doc.heightOfString(s,{width,lineGap:2});};
 const rule=(y:number)=>{doc.strokeColor(border).lineWidth(.7).moveTo(m,y).lineTo(right,y).stroke();};
 const caps=(s:string,x:number,y:number,width:number)=>block(s,x,y,width,9,'Helvetica-Bold',gold);
 let y=0;
 const masthead=(continuation=false)=>{
  doc.rect(0,0,doc.page.width,7).fill(ink);
  block('L U M I È R E',m,34,w,25,'Times-Roman');
  block('THE PRIVATE ATELIER',m,65,w,8,'Helvetica',gold);
  block('DEVELOPMENT / TEST ONLY',m,38,w,8,'Helvetica-Bold',gold,'right');
  rule(83);
  block(continuation?'Order summary / continued':'Order summary',m,101,w,29,'Times-Roman');
  block('ORDER #'+o.id.slice(0,8).toUpperCase(),m,140,w,10,'Helvetica-Bold',gold);
  block('Placed '+date(o.createdAt),m,140,w,10,'Helvetica',muted,'right');
  block('Reference: '+o.id,m,156,w,8,'Helvetica',muted);
  y=180;
 };
 const page=()=>{doc.addPage();masthead(true);};
 const ensure=(h:number)=>{if(y+h>limit)page();if(y+h>limit)throw new HttpError(422,'Order details exceed the printable page size.');};
 const payment=o.status==='CANCELLED'?'Cancelled - do not collect':o.status==='PAID'?'Paid (test)':o.paymentMethod==='COD'?'Payable on delivery (test)':'Awaiting payment';
 const status=o.status==='CANCELLED'?'Cancelled':o.fulfillment==='UNFULFILLED'?(o.status==='PAID'||o.paymentMethod==='COD'?'Confirmed':'Awaiting payment'):({PACKING:'Preparing your order',SHIPPED:'Shipped',OUT_FOR_DELIVERY:'Out for delivery',DELIVERED:'Delivered'} as Record<string,string>)[o.fulfillment]??o.fulfillment;
 const shortDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))?date(new Date(v+'T00:00:00Z')):safe(v);
 const addressLines=[safe(address.recipient),safe(address.line1),[safe(address.city),safe(address.state),safe(address.postalCode)].filter(Boolean).join(', '),safe(address.country)].filter(Boolean);
 const details=[status,'Payment: '+payment,'Method: '+(o.paymentMethod==='COD'?'Cash on Delivery':'Online (test)')];
 const estimate=snapshot(address.shippingEstimate);
 if(typeof estimate.earliestDate==='string'&&typeof estimate.latestDate==='string')details.push('Original test delivery: '+shortDate(estimate.earliestDate)+' - '+shortDate(estimate.latestDate));
 if(o.carrier||o.trackingNumber){details.push('Carrier: '+(safe(o.carrier)||'Not assigned'),'Tracking: '+(safe(o.trackingNumber)||'Not assigned'));}
 if(o.refund)details.push('Refund: '+o.refund.status+' (test) - '+amount(o.refund.amountPaise));
 masthead();
 const gap=12,cw=(w-gap)/2,inner=cw-28;
 const measure=(ls:string[])=>ls.reduce((n,v,i)=>n+height(v,inner,i===0?13:10,i===0?'Helvetica-Bold':'Helvetica')+4,0);
 const ah=measure(addressLines.length?addressLines:['Saved address unavailable']),dh=measure(details),ch=Math.max(115,Math.max(ah,dh)+47);
 ensure(ch);
 const panel=(x:number,label:string,lines:string[])=>{
  doc.roundedRect(x,y,cw,ch,4).fillAndStroke(cream,border);
  caps(label,x+14,y+13,inner);
  let yy=y+32;
  for(const [i,v] of lines.entries()){const size=i===0?13:10,font=i===0?'Helvetica-Bold':'Helvetica';block(v,x+14,yy,inner,size,font);yy+=height(v,inner,size,font)+4;}
 };
 panel(m,'DELIVERY ADDRESS',addressLines.length?addressLines:['Saved address unavailable']);panel(m+cw+gap,'ORDER & PAYMENT STATUS',details);
 y+=ch+26;
 const col=[m+10,m+265,m+310,m+405];
 const tableHeader=()=>{
  caps('ORDERED PIECES',m,y,w);y+=18;
  doc.rect(m,y,w,26).fill(ink);
  block('PRODUCT',col[0],y+8,245,8,'Helvetica-Bold','#FFFFFF');
  block('QTY',col[1],y+8,35,8,'Helvetica-Bold','#FFFFFF','center');
  block('UNIT PRICE',col[2],y+8,88,8,'Helvetica-Bold','#FFFFFF','right');
  block('AMOUNT',col[3],y+8,right-col[3]-10,8,'Helvetica-Bold','#FFFFFF','right');y+=26;
 };
 ensure(65);tableHeader();
 for(const [index,i] of o.items.entries()){
  const name=safe(i.name),meta='Size '+safe(i.size)+'  /  '+safe(i.color),sku='SKU: '+safe(i.sku);
  const itemWidth=245;
  const nh=height(name,itemWidth,12,'Helvetica-Bold'),mh=height(meta,itemWidth,9),sh=height(sku,itemWidth,8);
  const rh=Math.max(62,nh+mh+sh+24);
  if(y+rh>limit){page();tableHeader();}
  ensure(rh);
  if(index%2===0)doc.rect(m,y,w,rh).fill('#FAF8F4');
  block(name,col[0],y+10,itemWidth,12,'Helvetica-Bold');
  block(meta,col[0],y+12+nh,itemWidth,9,'Helvetica',muted);
  block(sku,col[0],y+14+nh+mh,itemWidth,8,'Helvetica',muted);
  block(String(i.quantity),col[1],y+12,35,10,'Helvetica',ink,'center');
  block(amount(i.unitPricePaise),col[2],y+12,88,9,'Helvetica',ink,'right');
  block(amount(i.unitPricePaise*i.quantity),col[3],y+12,right-col[3]-10,9,'Helvetica-Bold',ink,'right');
  y+=rh;rule(y);
 }
 if(!o.items.length){block('No item records available.',m+10,y+12,w-20,10,'Helvetica',muted);y+=38;rule(y);}
 y+=20;
 const breakdown=[['Merchandise subtotal',amount(o.subtotalPaise)],['Test shipping',o.shippingPaise===0?'Free / INR 0.00':amount(o.shippingPaise)],['Discount'+(o.couponCode?' ('+safe(o.couponCode)+')':''),amount(o.discountPaise)]];
 const bx=m+232,bw=right-bx,priceW=106,labelW=bw-priceW-18;
 const bh=breakdown.reduce((n,[k,v])=>n+Math.max(21,height(k,labelW,10)+6,height(v,priceW,10)+6),0);
 const refundText=o.refund?.status==='PROCESSED'?'Processed test refund: '+amount(o.refund.amountPaise):'';
 const payHeight=bh+70+(refundText?height(refundText,bw,9)+6:0);
 ensure(Math.max(payHeight,112)+24);
 caps('AT YOUR SERVICE',m,y+1,210);
 block('Thank you for choosing LUMIÈRE.',m,y+20,210,14,'Times-Roman');
 block('This is a development order summary. No actual payment or shipment is represented.',m,y+43,207,9,'Helvetica',muted);
 caps('PAYMENT BREAKDOWN',bx,y+1,bw);
 let yy=y+20;
 for(const [k,v] of breakdown){const rh=Math.max(21,height(k,labelW,10)+6,height(v,priceW,10)+6);block(k,bx,yy,labelW,10);block(v,right-priceW,yy,priceW,10,'Helvetica',ink,'right');yy+=rh;}
 doc.roundedRect(bx,yy,bw,49,3).fill(ink);
 block('ORIGINAL ORDER TOTAL',bx+12,yy+7,bw-24,8,'Helvetica-Bold','#E4C9A0');
 block(amount(o.totalPaise),bx+12,yy+20,bw-24,19,'Times-Roman','#FFFFFF','right');yy+=55;
 if(refundText){block(refundText,bx,yy,bw,9,'Helvetica',muted);yy+=height(refundText,bw,9)+6;}
 y=Math.max(y+104,yy)+14;
 block('Not a tax invoice or proof of real payment.',m,y,w,9,'Helvetica',muted);
 // Footer is written on each page after the page count is known by the caller.
 for(let n=0;n<doc.bufferedPageRange().count;n++){doc.switchToPage(n);doc.strokeColor(bronze).lineWidth(.7).moveTo(m,doc.page.height-55).lineTo(right,doc.page.height-55).stroke();}
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
   if(kind==='summary'){drawSummary(doc,o,address);}else{
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
    rule();heading('PACKING CHECKLIST');
    for(const i of o.items){
     const name=safe(i.name),details='SKU: '+safe(i.sku)+' | Size: '+safe(i.size)+' | Colour: '+safe(i.color);
     const price='[ ] Pack quantity: '+i.quantity;
     doc.font('Helvetica-Bold').fontSize(11);const nameHeight=doc.heightOfString(name,{width:width(),lineGap:2});doc.font('Helvetica').fontSize(10);const rowHeight=nameHeight+doc.heightOfString(details,{width:width(),lineGap:2})+doc.heightOfString(price,{width:width(),lineGap:2})+25;ensure(rowHeight);
     line(name,11,ink,'Helvetica-Bold');line(details,10,muted);line(price);rule();
    }
    if(!o.items.length)line('No item records available.',10,muted);
    textBlock('Total units to check: '+o.items.reduce((sum,i)=>sum+i.quantity,0),12,'Helvetica-Bold');textBlock('Internal test packing checklist. No actual dispatch.');
   }
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
