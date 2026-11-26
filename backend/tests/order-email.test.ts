import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderOrderEmail,type OrderEmailInput} from '../src/modules/orders/email-template.js';
const base:OrderEmailInput={event:'CONFIRMED',orderId:'12345678-1234-1234-1234-123456789abc',customerName:'Test <script>alert(1)</script>',paymentMethod:'COD',subtotalPaise:149900,shippingPaise:0,discountPaise:10000,totalPaise:139900,carrier:'Test Courier',trackingNumber:'TEST123',origin:'http://localhost:5173',cloudName:'testcloud',items:[{name:'Linen & cotton',size:'M',color:'Off White',quantity:1,unitPricePaise:149900,imageUrl:'https://res.cloudinary.com/testcloud/image/upload/v123/lumiere/test.png'}]};
test('six branded email variants have accurate event progress and plain text fallback',()=>{
 const events=['CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'] as const;
 const labels=['Confirmed','Packing','Shipped','Out for delivery','Delivered'];
 for(const [i,event] of events.entries()){
  const e=renderOrderEmail({...base,event});
  assert.match(e.subject,/^\[TEST\] LUMIÈRE/);assert.match(e.html,/Development test only/);assert.match(e.text,/Development test only/);
  assert.ok(e.html.includes(base.origin+'/orders/'+base.orderId));assert.ok(e.text.includes(base.orderId));
  assert.ok(e.html.includes('&lt;script&gt;'));assert.ok(!e.html.includes('<script>'));assert.ok(e.html.includes('Linen &amp; cotton'));
  assert.ok(e.html.includes('res.cloudinary.com/testcloud/image/upload/'));assert.ok(e.html.includes('1,399.00'));
  if(i<5){assert.ok(e.html.includes(labels[i]+' (current)'));assert.match(e.html,/TRACK YOUR ORDER/);}else{assert.ok(!e.html.includes('(current)'));assert.match(e.html,/VIEW YOUR ORDER/);assert.doesNotMatch(e.text,/Online test payment confirmed/);}
  if(i>=2&&i<=4)assert.match(e.html,/TEST123/);else assert.doesNotMatch(e.html,/TEST123/);
  if(event==='DELIVERED')assert.match(e.text,/test collection confirmed/);
 }
});
test('unapproved image URLs omitted and online payment wording accurate',()=>{
 for(const imageUrl of ['https://evil.example/image.png','https://res.cloudinary.com/other/image/upload/a.png','http://res.cloudinary.com/testcloud/image/upload/a.png','https://res.cloudinary.com/testcloud/image/upload/']){
  const e=renderOrderEmail({...base,paymentMethod:'ONLINE',items:[{...base.items[0],imageUrl}]});
  assert.doesNotMatch(e.html,/<img /);assert.match(e.text,/Online test payment confirmed/);
 }
 assert.match(renderOrderEmail({...base,paymentMethod:'ONLINE',event:'CANCELLED'}).text,/Online payment order — cancelled/);
});
