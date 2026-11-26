import {useState} from 'react';
import type {Order} from './api';
const stages=['UNFULFILLED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED'] as const;
const labels=['Confirmed','Packing','Shipped','Out for delivery','Delivered'];
export function orderStage(o:Pick<Order,'status'|'paymentMethod'|'fulfillment'>){return o.status==='CANCELLED'||(o.status==='PENDING_PAYMENT'&&o.paymentMethod==='ONLINE')?-1:stages.indexOf(o.fulfillment);}
export function OrderJourney({order}:{order:Pick<Order,'status'|'paymentMethod'|'fulfillment'>}){
 const stage=orderStage(order);
 if(order.status==='CANCELLED')return <p className="order-stopped">This order has been cancelled.</p>;
 return <ol className="order-journey" aria-label="Order fulfillment progress">{labels.map((label,i)=><li key={label} className={i<=stage?'is-complete':''} aria-current={i===stage?'step':undefined}><span className="journey-dot" aria-hidden="true">{i<=stage&&<svg viewBox="0 0 22 22" width="22" height="22"><path d="M6 11l3 3 7-7" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/></svg>}</span><span className="journey-label">{label}</span><span className="journey-sr">{i===stage?'Current stage':i<stage?'Completed':'Pending'}</span></li>)}</ol>;
}
export function OrderPhoto({url,name}:{url?:string|null;name:string}){
 const [failed,setFailed]=useState<string|null>(null);
 return <div className="order-item-photo">{url&&failed!==url&&/^https:\/\//i.test(url)?<img src={url} alt={name} onError={()=>setFailed(url)}/>:<span>Image unavailable</span>}</div>;
}
