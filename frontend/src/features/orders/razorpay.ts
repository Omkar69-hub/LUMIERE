type ResponseData={razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string};
type Options={key:string;amount:number;currency:'INR';order_id:string;name:string;description:string;handler:(data:ResponseData)=>void;modal:{ondismiss:()=>void}};
type Checkout={open:()=>void;on:(event:string,fn:()=>void)=>void};
declare global{interface Window{Razorpay?:new(options:Options)=>Checkout}}
let loading:Promise<void>|undefined;
export function loadRazorpay(){
 if(window.Razorpay)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.referrerPolicy='no-referrer';
  const timeout=window.setTimeout(()=>{script.remove();reject(new Error('Payment interface timed out.'));},15000);
  script.onload=()=>{window.clearTimeout(timeout);window.Razorpay?resolve():reject(new Error('Payment interface unavailable.'));};
  script.onerror=()=>{window.clearTimeout(timeout);script.remove();reject(new Error('Unable to load payment interface.'));};
  document.head.appendChild(script);
 }).catch(e=>{loading=undefined;throw e;});
 return loading;
}
