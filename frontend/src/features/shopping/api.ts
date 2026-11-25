import { api } from '../../services/api';
export type CartItem={id:string;variantId:string;slug:string;name:string;size:string;color:string;sku:string;quantity:number;pricePaise:number;lineTotalPaise:number;available:boolean;published:boolean;maxQuantity:number;image:{url:string;alt:string}|null};
export type Cart={items:CartItem[];subtotalPaise:number;currency:'INR';allAvailable:boolean};
export type Saved={id:string;slug:string;name:string;pricePaise:number;image:{url:string;alt:string}|null};
export const getCart=()=>api<Cart>('/cart');
export const getWishlist=()=>api<Saved[]>('/wishlist');
