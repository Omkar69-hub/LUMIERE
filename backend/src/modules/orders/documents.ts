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
// Heritage Edition: a vector A4 layout, not a raster mockup.
function drawSummary(doc:InstanceType<typeof PDFDocument>,o:DocumentOrder,address:Record<string,unknown>){
 const m=45,w=doc.page.width-2*m,right=m+w,center=doc.page.width/2,limit=doc.page.height-100;
 const ivory='#F8F3E9',cream='#F1E8D8',border='#AE8950',bronze='#80520D',dark='#181612';
 const block=(s:string,x:number,y:number,width:number,size=10,font='Times-Roman',color=dark,align:'left'|'right'|'center'='left')=>{
  doc.font(font).fontSize(size).fillColor(color).text(s,x,y,{width,align,lineGap:2});
 };
 const height=(s:string,width:number,size=10,font='Times-Roman')=>{doc.font(font).fontSize(size);return doc.heightOfString(s,{width,lineGap:2});};
 const rule=(y:number,x=m,x2=right)=>{doc.strokeColor(border).lineWidth(.65).moveTo(x,y).lineTo(x2,y).stroke();};
 const caps=(s:string,x:number,y:number,width:number,align:'left'|'center'='left')=>block(s,x,y,width,10,'Times-Bold',bronze,align);
 let y=0;
 const masthead=(continuation=false)=>{
  const pw=doc.page.width,ph=doc.page.height;
  doc.rect(0,0,pw,ph).fill(ivory);
  doc.rect(14,14,pw-28,ph-28).lineWidth(1.4).stroke(bronze);
  doc.rect(19,19,pw-38,ph-38).lineWidth(.5).stroke(border);
  caps('H E R I T A G E   E D I T I O N',m,34,w,'center');
  rule(40,m+50,m+121);rule(40,right-121,right-50);
  if(!continuation){
   doc.circle(center,92,34).lineWidth(1.2).stroke(bronze);
   doc.circle(center,92,29.5).lineWidth(.6).stroke(bronze);
   block('L',center-30,67,60,45,'Times-Roman',bronze,'center');
   block('L U M I È R E',m,132,w,30,'Times-Roman',dark,'center');
   caps('T H E   P R I V A T E   A T E L I E R',m,169,w,'center');
   rule(192);
   block('Order Summary',m,204,w,38,'Times-Roman',dark,'center');
   caps('ORDER #'+o.id.slice(0,8).toUpperCase()+'   /   PLACED ON '+date(o.createdAt).toUpperCase(),m,249,w,'center');
   block('Reference: '+o.id,m,265,w,8,'Helvetica',muted,'center');
   y=285;
  }else{
   block('L U M I È R E',m,55,w,22,'Times-Roman',dark,'center');
   rule(85);
   block('Order Summary / continued',m,96,w,24,'Times-Roman',dark,'center');
   block('Order '+o.id,m,125,w,9,'Helvetica',muted,'center');
   y=150;
  }
 };
 const page=()=>{doc.addPage();masthead(true);};
 const ensure=(h:number)=>{if(y+h>limit)page();if(y+h>limit)throw new HttpError(422,'Order details exceed the printable page size.');};
 const payment=o.status==='CANCELLED'?'Cancelled - do not collect':o.status==='PAID'?'Payment received (test)':o.paymentMethod==='COD'?'Payable on delivery (test)':'Awaiting payment';
 const status=o.status==='CANCELLED'?'Cancelled':o.fulfillment==='UNFULFILLED'?(o.status==='PAID'||o.paymentMethod==='COD'?'Confirmed':'Awaiting payment'):({PACKING:'Preparing your order',SHIPPED:'Shipped',OUT_FOR_DELIVERY:'Out for delivery',DELIVERED:'Delivered'} as Record<string,string>)[o.fulfillment]??o.fulfillment;
 const shortDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))?date(new Date(v+'T00:00:00Z')):safe(v);
 const addressLines=[safe(address.recipient),safe(address.line1),[safe(address.city),safe(address.state),safe(address.postalCode)].filter(Boolean).join(', '),safe(address.country)].filter(Boolean);
 const details=[status,payment,'Method: '+(o.paymentMethod==='COD'?'Cash on Delivery':'Online (test)')];
 const estimate=snapshot(address.shippingEstimate);
 if(typeof estimate.earliestDate==='string'&&typeof estimate.latestDate==='string')details.push('Original test delivery: '+shortDate(estimate.earliestDate)+' - '+shortDate(estimate.latestDate));
 if(o.carrier||o.trackingNumber)details.push('Carrier: '+(safe(o.carrier)||'Not assigned'),'Tracking: '+(safe(o.trackingNumber)||'Not assigned'));
 if(o.refund)details.push('Refund: '+o.refund.status+' (test) - '+amount(o.refund.amountPaise));
 masthead();
 const gap=14,cw=(w-gap)/2,inner=cw-30;
 const firstFont='Times-Bold';
 const measure=(ls:string[])=>ls.reduce((n,v,i)=>n+height(v,inner,i===0?16:11,i===0?firstFont:'Times-Roman')+3,0);
 const ah=measure(addressLines.length?addressLines:['Saved address unavailable']),dh=measure(details),ch=Math.max(108,Math.max(ah,dh)+34);
 ensure(ch);
 const panel=(x:number,label:string,lines:string[])=>{
  doc.roundedRect(x,y,cw,ch,4).lineWidth(.6).fillAndStroke(cream,border);
  caps(label,x+15,y+11,inner);
  let yy=y+28;
  for(const [i,v] of lines.entries()){const size=i===0?16:11,font=i===0?firstFont:'Times-Roman';block(v,x+15,yy,inner,size,font);yy+=height(v,inner,size,font)+3;}
 };
 panel(m,'DELIVERY ADDRESS',addressLines.length?addressLines:['Saved address unavailable']);panel(m+cw+gap,'ORDER STATUS',details);
 y+=ch+18;
 const col=[m+14,m+240,m+281,m+391],itemWidth=218;
 const tableHeader=()=>{
  caps('ORDERED ITEMS',m,y,w);y+=17;
  doc.rect(m,y,w,25).fill(dark);
  block('PRODUCT',col[0],y+7,itemWidth,10,'Times-Bold',ivory);
  block('QTY',col[1],y+7,35,10,'Times-Bold',ivory,'center');
  block('UNIT PRICE',col[2],y+7,100,10,'Times-Bold',ivory,'right');
  block('AMOUNT',col[3],y+7,right-col[3]-12,10,'Times-Bold',ivory,'right');y+=25;
 };
 ensure(80);tableHeader();
 for(const [index,i] of o.items.entries()){
  const name=safe(i.name),meta=safe(i.color)+' / Size '+safe(i.size),sku='SKU: '+safe(i.sku);
  const nh=height(name,itemWidth,15,'Times-Bold'),mh=height(meta,itemWidth,11,'Times-Italic'),sh=height(sku,itemWidth,10);
  const rh=Math.max(64,nh+mh+sh+18);
  if(y+rh>limit){page();tableHeader();}
  ensure(rh);
  doc.rect(m,y,w,rh).lineWidth(.55).fillAndStroke(index%2===0?'#F5EDDF':ivory,border);
  block(name,col[0],y+8,itemWidth,15,'Times-Bold');
  block(meta,col[0],y+9+nh,itemWidth,11,'Times-Italic',muted);
  block(sku,col[0],y+10+nh+mh,itemWidth,10);
  block(String(i.quantity),col[1],y+13,35,11,'Times-Roman',dark,'center');
  block(amount(i.unitPricePaise),col[2],y+13,100,10,'Times-Roman',dark,'right');
  block(amount(i.unitPricePaise*i.quantity),col[3],y+13,right-col[3]-12,10,'Times-Bold',dark,'right');
  y+=rh;
 }
 if(!o.items.length){block('No item records available.',m+10,y+10,w-20,10,'Times-Roman',muted);y+=32;rule(y);}
 y+=18;
 const breakdown=[['Merchandise subtotal',amount(o.subtotalPaise)],['Test shipping',o.shippingPaise===0?'Free / INR 0.00':amount(o.shippingPaise)],['Discount'+(o.couponCode?' ('+safe(o.couponCode)+')':''),o.discountPaise>0?'-'+amount(o.discountPaise):amount(0)]];
 const bx=m+222,bw=right-bx,priceW=106,labelW=bw-priceW-10;
 const bh=breakdown.reduce((n,[k,v])=>n+Math.max(18,height(k,labelW,11)+4,height(v,priceW,11)+4),0);
 const refundText=o.refund?.status==='PROCESSED'?'Processed test refund: '+amount(o.refund.amountPaise):'';
 const payHeight=bh+64+(refundText?height(refundText,bw,10)+6:0);
 ensure(Math.max(payHeight,112));
 caps('AT YOUR SERVICE',m,y,200);
 block('Thank you for choosing',m,y+19,200,18,'Times-Italic');
 block('LUMIÈRE.',m,y+40,200,21,'Times-Roman');
 block('For questions about this order, please use Customer care in your account.',m,y+70,194,11,'Times-Roman');
 doc.strokeColor(border).lineWidth(.7).moveTo(bx-14,y).lineTo(bx-14,y+Math.max(payHeight,112)).stroke();
 caps('PAYMENT BREAKDOWN',bx,y,bw);
 let yy=y+18;
 for(const [k,v] of breakdown){const rh=Math.max(18,height(k,labelW,11)+4,height(v,priceW,11)+4);block(k,bx,yy,labelW,11);block(v,right-priceW,yy,priceW,11,'Times-Roman',dark,'right');yy+=rh;rule(yy-1,bx,right);}
 yy+=6;
 const gradient=doc.linearGradient(bx,yy,right,yy+42).stop(0,'#956414').stop(1,'#69400B');
 doc.roundedRect(bx,yy,bw,42,4).fill(gradient);
 block('ORDER TOTAL',bx+10,yy+15,88,9,'Times-Bold',ivory);
 doc.strokeColor('#DBC396').lineWidth(.6).moveTo(bx+94,yy+8).lineTo(bx+94,yy+34).stroke();
 const total=amount(o.totalPaise),tw=bw-108;
 doc.font('Times-Roman').fontSize(22);const ts=Math.min(22,22*tw/Math.max(1,doc.widthOfString(total)));
 block(total,bx+100,yy+10,tw,ts,'Times-Roman',ivory,'right');yy+=48;
 if(refundText)block(refundText,bx,yy,bw,10,'Times-Roman',muted);
 // Fixed footer for every page. No fictional contact or payment information.
 const range=doc.bufferedPageRange();
 for(let n=0;n<range.count;n++){
  doc.switchToPage(range.start+n);const fy=doc.page.height-83;
  rule(fy);caps('A NOTE FROM LUMIÈRE',m,fy+8,w,'center');
  block('Development / test only. No actual payment or shipment.',m,fy+22,w,10,'Times-Italic',dark,'center');
  block('Not a tax invoice or proof of real payment.',m,fy+36,w,9,'Times-Roman',muted,'center');
  rule(fy+51,center-67,center-10);rule(fy+51,center+10,center+67);
  doc.moveTo(center,fy+47).lineTo(center+4,fy+51).lineTo(center,fy+55).lineTo(center-4,fy+51).closePath().fill(bronze);
 }
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
   for(let n=0;n<range.count;n++){doc.switchToPage(range.start+n);doc.font('Helvetica').fontSize(8).fillColor(muted).text(kind==='summary'?String(n+1).padStart(2,'0')+' / '+String(range.count).padStart(2,'0'):'TEST ONLY / '+(n+1)+' of '+range.count,margin,doc.page.height-margin-12,{width:width(),align:'right',lineBreak:false});}
   doc.end();
  }catch(e){doc.destroy();reject(e);}
 });
}
export async function sendOrderDocument(res:Response,o:DocumentOrder,kind:DocumentKind){
 const pdf=await renderOrderDocument(o,kind);
 res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="lumiere-'+kind+'-'+o.id+'.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(pdf);
}
