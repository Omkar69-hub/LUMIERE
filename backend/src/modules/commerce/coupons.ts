import {z} from 'zod';
import type {Prisma} from '../../generated/prisma/client.js';
import {HttpError} from '../../middleware/http.js';
export const couponCode=z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/);
type Discount={discountPaise:number;couponCode:string|null};
export async function calculateDiscount(tx:Prisma.TransactionClient,subtotal:number,code?:string,lock=false):Promise<Discount>{
 if(!code)return {discountPaise:0,couponCode:null};
 if(lock)await tx.$queryRaw `SELECT "code" FROM "Coupon" WHERE "code" = ${code} FOR SHARE`;
 const c=await tx.coupon.findUnique({where:{code}});
 if(!c?.active||(c.expiresAt&&c.expiresAt<=new Date())||subtotal<c.minimumPaise)throw new HttpError(409,'Coupon is not valid for this bag.');
 const discountPaise=Math.floor(subtotal*c.percent/100);
 if(subtotal-discountPaise<100)throw new HttpError(409,'Discount would reduce the payable amount below the test gateway minimum.');
 return {discountPaise,couponCode:code};
}
