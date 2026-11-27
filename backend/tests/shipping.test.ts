import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testShipping,shippingTestEnabled} from '../src/modules/orders/shipping.js';
test('mock shipping uses explicit zones, subtotal threshold and India-local calendar dates',()=>{
 const now=new Date('2026-11-27T20:00:00Z');
 assert.deepEqual(testShipping('411001','IN',149900,now),{shippingPaise:4900,estimate:{zone:'A',earliestDate:'2026-11-30',latestDate:'2026-12-02',testMode:true}});
 assert.deepEqual(testShipping('110001','IN',299899,now),{shippingPaise:7900,estimate:{zone:'B',earliestDate:'2026-12-02',latestDate:'2026-12-05',testMode:true}});
 assert.equal(testShipping('110001','IN',299900,now).shippingPaise,0);
 assert.equal(testShipping('431001','IN',300000,now).shippingPaise,0);
 assert.throws(()=>testShipping('000000','IN',10000,now));
 assert.throws(()=>testShipping('411001','US',10000,now));
});
test('production cannot enable mock shipping',()=>{const previous=process.env.NODE_ENV,flag=process.env.SHIPPING_TEST_ENABLED;try{process.env.NODE_ENV='production';process.env.SHIPPING_TEST_ENABLED='true';assert.equal(shippingTestEnabled(),false);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;if(flag===undefined)delete process.env.SHIPPING_TEST_ENABLED;else process.env.SHIPPING_TEST_ENABLED=flag;}});
