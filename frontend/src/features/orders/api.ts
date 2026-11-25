import { api } from '../../services/api';
export type Address={id:string;recipient:string;line1:string;city:string;state:string;postalCode:string;country:string};
export type Order={id:string;status:'PENDING_PAYMENT'|'PAID'|'CANCELLED';gatewayState:'NEW'|'CREATING'|'READY'|'REVIEW';fulfillment:'UNFULFILLED'|'PACKING'|'SHIPPED'|'DELIVERED';trackingNumber:string|null;carrier:string|null;subtotalPaise:number;shippingPaise:number;totalPaise:number;address:Omit<Address,'id'>;items:{id:string;name:string;size:string;color:string;sku:string;quantity:number;unitPricePaise:number}[];createdAt:string;paidAt:string|null};
export type Config={paymentEnabled:boolean;testMode:boolean;shippingPaise:number};
export type PaymentSetup={keyId:string;orderId:string;amount:number;currency:'INR'};
export const getOrders=(page:number)=>api<{items:Order[];hasMore:boolean}>('/orders?page='+page);
export const getOrder=(id:string)=>api<Order>('/orders/'+encodeURIComponent(id));
export const getConfig=()=>api<Config>('/orders/configuration');
export const getAddresses=()=>api<Address[]>('/addresses');
