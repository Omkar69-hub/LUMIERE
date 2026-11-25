import { api } from '../../services/api';
export type Product={id:string;slug:string;name:string;description:string;pricePaise:number;category:{name:string;slug:string};brand:{name:string;slug:string};images:{url:string;alt:string}[];variants:{id:string;sku:string;size:string;color:string;available:boolean}[]};
export type Taxonomy={name:string;slug:string};
export type ProductList={items:Product[];total:number;page:number;limit:number};
export const getProducts=(params:URLSearchParams)=>api<ProductList>('/products?'+params.toString());
export const getProduct=(slug:string)=>api<Product>('/products/'+encodeURIComponent(slug));
export const formatPrice=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(paise/100);
