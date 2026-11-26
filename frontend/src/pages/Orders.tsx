import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,useParams} from 'react-router-dom';
import {api,ApiError,type User} from '../services/api';
import {getOrders,getOrder,getConfig,type PaymentSetup} from '../features/orders/api';
import {loadRazorpay} from '../features/orders/razorpay';
import {formatPrice} from '../features/catalog/api';
import {ReturnPanel} from '../features/orders/ReturnPanel';
import {StoreHeader} from '../components/StoreHeader';
import {OrderJourney,OrderPhoto,orderStage} from '../features/orders/OrderJourney';
import '../styles/order-detail.css';
const label=(s:string,method?:string)=>s==='PENDING_PAYMENT'?(method==='COD'?'Cash on Delivery order placed':'Awaiting payment'):s==='PAID'?'Paid (test)':'Cancelled';
function useSession(){return useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false});}
export function Orders(){const [page,setPage]=useState(1),session=useSession(),uid=session.data?.user.id;const orders=useQuery({queryKey:['orders',uid,page],queryFn:()=>getOrders(page),enabled:!!uid});
 return <main className="store"><StoreHeader/><div className="collection-intro"><p className="eyebrow">YOUR PRIVATE ATELIER</p><h1>Order history</h1></div>{session.isPending?<p>Checking account…</p>:!uid?<p>{session.error instanceof ApiError&&session.error.status===401?<Link to="/login">Sign in to view orders</Link>:'Unable to verify account.'}</p>:orders.isPending?<p role="status">Loading orders…</p>:orders.isError?<p role="alert">{orders.error.message}</p>:<>{orders.data.items.length===0&&<p>No orders on this page.</p>}{orders.data.items.map(o=><article className="order-row" key={o.id}><Link to={'/orders/'+o.id}>Order {o.id.slice(0,8)}</Link><p>{new Date(o.createdAt).toLocaleDateString('en-IN')} · {label(o.status,o.paymentMethod)}</p><strong>{formatPrice(o.totalPaise)}</strong></article>)}<div className="between pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button disabled={!orders.data.hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}</main>;
}
export function OrderDetail(){
 const {id=''}=useParams(),session=useSession(),uid=session.data?.user.id,client=useQueryClient();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const order=useQuery({queryKey:['order',uid,id],queryFn:()=>getOrder(id),enabled:!!uid&&!!id});
 const config=useQuery({queryKey:['orderConfig',uid],queryFn:getConfig,enabled:!!uid});
 async function refresh(){await Promise.all([client.invalidateQueries({queryKey:['order',uid,id]}),client.invalidateQueries({queryKey:['orders',uid]})]);}
 async function pay(){if(busy)return;setBusy(true);setError('');setMessage('');try{
  await loadRazorpay();
  const data=await api<PaymentSetup>('/orders/'+id+'/payment','POST',{});
  if(!data.keyId.startsWith('rzp_test_')||!window.Razorpay)throw new Error('Test-only payment interface unavailable.');
  const checkout=new window.Razorpay({key:data.keyId,amount:data.amount,currency:data.currency,order_id:data.orderId,name:'LUMIÈRE',description:'Test order — no live charge',handler:async result=>{
   try{if(result.razorpay_order_id!==data.orderId)throw new Error('Payment reference mismatch.');
    const v=await api<{status:string}>('/orders/'+id+'/verify','POST',{paymentId:result.razorpay_payment_id,signature:result.razorpay_signature});
    setMessage(v.status==='PAID'?'Test payment confirmed by server.':'Payment awaiting capture. Refresh order status.');
   }catch(e){setError(e instanceof Error?e.message:'Verification unavailable. Check order status.');}finally{await refresh();setBusy(false);}
  },modal:{ondismiss:()=>{setMessage('Payment window closed. Check status before trying again.');setBusy(false);void refresh();}}});
  checkout.on('payment.failed',()=>{setError('Payment attempt failed. Check order status before retrying.');});checkout.open();
 }catch(e){setError(e instanceof Error?e.message:'Payment setup failed.');setBusy(false);await refresh();}}
 async function cancel(){if(busy)return;setBusy(true);setError('');try{await api('/orders/'+id+'/cancel','POST',{});await refresh();setMessage('Order cancelled. Reserved stock released.');}catch(e){setError(e instanceof Error?e.message:'Cancellation failed.');}finally{setBusy(false);}}
 const o=order.data;
 const [copyMessage,setCopyMessage]=useState('');
 async function copyTracking(){if(!o?.trackingNumber)return;try{await navigator.clipboard.writeText(o.trackingNumber);setCopyMessage('Tracking number copied.');}catch{setCopyMessage('Unable to copy automatically. Select the tracking number to copy it.');}}
 return <main className="store"><StoreHeader/><Link to="/orders">All orders</Link>{session.isPending?<p>Checking account…</p>:!uid?<p><Link to="/login">Sign in</Link> to view order details.</p>:order.isPending?<p>Loading order…</p>:order.isError?<p role="alert">{order.error.message}</p>:o&&<div className="order-detail">
 <header className="order-detail-heading"><p className="eyebrow">MY ACCOUNT / MY ORDERS</p><h1>Your order journey.</h1><div className="between"><p className="order-reference">Order #{o.id.slice(0,8).toUpperCase()}</p><span className={'order-status '+(o.status==='CANCELLED'?'is-cancelled':orderStage(o)===4?'is-delivered':'')}>{o.status==='CANCELLED'?'Cancelled':orderStage(o)<0?'Awaiting payment':['Confirmed','Packing','Shipped','Out for delivery','Delivered'][orderStage(o)]}</span></div><p className="hint">Development test only · No actual shipment or payment.</p></header>
 <div className="order-detail-grid"><div className="order-detail-main"><section className="order-card" aria-label="Order journey and items">
 <div className="order-selection">{o.items.map(i=><article className="order-selection-item" key={i.id}><OrderPhoto url={i.imageUrl} name={i.name}/><div><h2>{i.name}</h2><p>{i.color} · Size {i.size}</p><p>Quantity: {i.quantity}</p><strong>{formatPrice(i.unitPricePaise*i.quantity)}</strong></div></article>)}</div>
 <OrderJourney order={o}/>
 <div className="order-shipment"><div className="order-shipment-title"><svg aria-hidden="true" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z M3 7l9 4 9-4 M12 11v10"/>{orderStage(o)===4&&<path d="m15 15 2 2 3-4"/>}</svg><strong>{o.status==='CANCELLED'?'Order cancelled':orderStage(o)===4?'Successfully delivered':orderStage(o)===3?'Out for delivery':orderStage(o)===2?'Your order is on its way':orderStage(o)===1?'Preparing your order':orderStage(o)===0?'Order confirmed':'Awaiting payment'}</strong></div>
 {o.status!=='CANCELLED'&&o.trackingNumber&&<><p>Courier: {o.carrier||'Not specified'}</p><div className="order-tracking-copy"><span>{o.trackingNumber}</span><button type="button" className="order-copy-button" onClick={()=>void copyTracking()}>Copy</button></div><p role="status" className="hint">{copyMessage}</p></>}
 {o.status!=='CANCELLED'&&!o.trackingNumber&&<p>Tracking details will appear after dispatch.</p>}
 <p className="hint">Shipment status is updated by our team; live courier tracking is not connected.</p></div>
 </section>
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
 {o.status==='PENDING_PAYMENT'&&<div className="purchase-controls">{o.paymentMethod==='ONLINE'&&(o.gatewayState==='NEW'||o.gatewayState==='READY')&&<button className="primary" disabled={busy||!config.data?.paymentEnabled} onClick={()=>void pay()}>Open Razorpay test checkout</button>}{o.gatewayState==='NEW'&&o.fulfillment==='UNFULFILLED'&&<button disabled={busy} onClick={()=>void cancel()}>{o.paymentMethod==='COD'?'Cancel order':'Cancel unpaid order'}</button>}{(o.gatewayState==='CREATING'||o.gatewayState==='REVIEW')&&<p role="alert">Payment setup requires reconciliation. Do not create another order.</p>}</div>}
 <div className="order-actions">{o.status==='PAID'&&o.fulfillment==='DELIVERED'&&<a className="order-outline" href="#order-return">Request return</a>}<Link className="primary" to="/support">Contact support</Link><button type="button" className="order-outline" disabled={busy} onClick={()=>void refresh()}>Refresh order status</button></div>
 {o.whatsappOptedIn&&<button className="order-outline" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/orders/'+id+'/whatsapp-opt-out','POST',{});await refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to stop WhatsApp updates.');}finally{setBusy(false);}}}>Stop WhatsApp updates for this order</button>}
 {o.status==='PAID'&&o.fulfillment==='DELIVERED'&&<div className="order-card order-return" id="order-return"><ReturnPanel order={o} uid={uid}/></div>}
 </div><aside className="order-detail-side"><section className="order-card"><h2>Payment summary</h2><dl className="order-summary"><div><dt>Payment method</dt><dd>{o.paymentMethod==='COD'?'Cash on Delivery':'Online (test)'}</dd></div><div><dt>Payment status</dt><dd className={o.status==='PAID'?'order-paid':''}>{o.status==='PAID'?'Paid (test)':o.status==='CANCELLED'?'Cancelled':o.paymentMethod==='COD'?'Payable on delivery':'Awaiting payment'}</dd></div><div><dt>Subtotal</dt><dd>{formatPrice(o.subtotalPaise)}</dd></div><div><dt>Test shipping</dt><dd>{formatPrice(o.shippingPaise)}</dd></div>{o.discountPaise>0&&<div><dt>Discount {o.couponCode&&'('+o.couponCode+')'}</dt><dd>−{formatPrice(o.discountPaise)}</dd></div>}<div className="order-total"><dt>Total</dt><dd>{formatPrice(o.totalPaise)}</dd></div></dl></section><section className="order-card"><h2>Delivery address</h2><address>{o.address.recipient}<br/>{o.address.line1}<br/>{o.address.city}, {o.address.state} {o.address.postalCode}<br/>{o.address.country}</address></section></aside></div></div>}</main>;
}
