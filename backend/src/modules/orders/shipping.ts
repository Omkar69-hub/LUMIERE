import {HttpError} from '../../middleware/http.js';
export const shippingTestEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.SHIPPING_TEST_ENABLED==='true';
export const TEST_FREE_SHIPPING_PAISE=299900;
export type ShippingEstimate={zone:'A'|'B';earliestDate:string;latestDate:string;testMode:true};
export function testShipping(postalCode:string,country:string,subtotalPaise:number,now=new Date()){
 if(country!=='IN'||!(/^[1-8][0-9]{5}$/.test(postalCode)))throw new HttpError(400,'Enter a supported six-digit Indian PIN for the simulated delivery estimate.');
 const near=/^4[1-4]/.test(postalCode),days=near?[2,4]:[4,7];
 // Calendar-day mock estimates from the India-local order date. Not verified carrier serviceability.
 const localDate=new Date(now.getTime()+330*60000).toISOString().slice(0,10);
 const dateAt=(days:number)=>new Date(Date.parse(localDate+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 const estimate:ShippingEstimate={zone:near?'A':'B',earliestDate:dateAt(days[0]),latestDate:dateAt(days[1]),testMode:true};
 return {shippingPaise:subtotalPaise>=TEST_FREE_SHIPPING_PAISE?0:near?4900:7900,estimate};
}
