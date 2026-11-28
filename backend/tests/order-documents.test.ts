import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderOrderDocument,canPrepareShipment} from '../src/modules/orders/documents.js';
const order={id:'00000000-0000-4000-8000-000000000001',createdAt:new Date('2026-11-27T10:00:00Z'),addressSnapshot:{recipient:'Test Buyer',line1:'Synthetic test street',city:'Pune',state:'Maharashtra',postalCode:'411001',country:'IN',shippingEstimate:{earliestDate:'2026-11-29',latestDate:'2026-12-01'}},status:'PENDING_PAYMENT',paymentMethod:'COD',fulfillment:'UNFULFILLED',trackingNumber:null,carrier:null,subtotalPaise:149900,shippingPaise:4900,discountPaise:0,couponCode:null,totalPaise:154800,items:[{name:'Classic Linen Shirt',sku:'LUM-TEST-M',size:'M',color:'Off White',quantity:1,unitPricePaise:149900}],refund:null};
test('three test PDFs are generated with correct page sizes',async()=>{
 for(const kind of ['summary','packing-slip','shipping-label'] as const){const p=await renderOrderDocument(order,kind),s=p.toString('latin1');assert.ok(s.startsWith('%PDF-'));assert.match(s,/%%EOF/);assert.match(s,kind==='shipping-label'?/\/MediaBox\s*\[0 0 288 432\]/:/\/MediaBox\s*\[0 0 595/);if(kind==='shipping-label')assert.equal((s.match(/\/Type \/Page\b/g)||[]).length,1);}
});
test('long summaries paginate and labels reject unprintable data',async()=>{
 const long=await renderOrderDocument({...order,items:Array.from({length:70},()=>({...order.items[0],name:'Long product description '.repeat(4)}))},'summary');assert.ok((long.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1);
 await assert.rejects(async()=>renderOrderDocument({...order,addressSnapshot:{...order.addressSnapshot,recipient:'नाम'}},'shipping-label'),/Latin-script/);
 await assert.rejects(async()=>renderOrderDocument({...order,status:'CANCELLED'},'shipping-label'),/active confirmed/);
 await assert.rejects(async()=>renderOrderDocument({...order,addressSnapshot:{}},'packing-slip'),/complete saved/);
 assert.equal(canPrepareShipment({...order,fulfillment:'DELIVERED'}),false);
});
