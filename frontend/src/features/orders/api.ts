import { api } from '../../services/api';
export type Address={id:string;recipient:string;line1:string;city:string;state:string;postalCode:string;country:string};
export type PaymentMethod='ONLINE'|'COD';
export type Order={id:string;paymentMethod:PaymentMethod;status:'PENDING_PAYMENT'|'PAID'|'CANCELLED';gatewayState:'NEW'|'CREATING'|'READY'|'REVIEW';fulfillment:'UNFULFILLED'|'PACKING'|'SHIPPED'|'DELIVERED';trackingNumber:string|null;carrier:string|null;subtotalPaise:number;shippingPaise:number;discountPaise:number;couponCode:string|null;totalPaise:number;address:Omit<Address,'id'>;items:{id:string;name:string;size:string;color:string;sku:string;quantity:number;unitPricePaise:number}[];createdAt:string;paidAt:string|null};
export type Config={paymentEnabled:boolean;codEnabled:boolean;testMode:boolean;shippingPaise:number};
export type PaymentSetup={keyId:string;orderId:string;amount:number;currency:'INR'};
export const getOrders=(page:number)=>api<{items:Order[];hasMore:boolean}>('/orders?page='+page);
export const getOrder=(id:string)=>api<Order>('/orders/'+encodeURIComponent(id));
export const getConfig=()=>api<Config>('/orders/configuration');
export const getAddresses=()=>api<Address[]>('/addresses');

export type Quote={subtotalPaise:number;shippingPaise:number;discountPaise:number;couponCode:string|null;totalPaise:number};
export type ReturnRequest={id:string;orderId:string;reason:string;status:'REQUESTED'|'APPROVED'|'REJECTED'|'RECEIVED';reviewNote:string|null;createdAt:string};
