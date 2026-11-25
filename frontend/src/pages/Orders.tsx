import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,useParams} from 'react-router-dom';
import {api,ApiError,type User} from '../services/api';
import {getOrders,getOrder,getConfig,type PaymentSetup} from '../features/orders/api';
import {loadRazorpay} from '../features/orders/razorpay';
import {formatPrice} from '../features/catalog/api';
import {StoreHeader} from '../components/StoreHeader';
const label=(s:string)=>s==='PENDING_PAYMENT'?'Awaiting payment':s==='PAID'?'Paid (test)':'Cancelled';
function useSession(){return useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false});}
export function Orders(){const [page,setPage]=useState(1),session=useSession(),uid=session.data?.user.id;const orders=useQuery({queryKey:['orders',uid,page],queryFn:()=>getOrders(page),enabled:!!uid});
 return <main className="store"><StoreHeader/><div className="collection-intro"><p className="eyebrow">YOUR PRIVATE ATELIER</p><h1>Order history</h1></div>{session.isPending?<p>Checking account…</p>:!uid?<p>{session.error instanceof ApiError&&session.error.status===401?<Link to="/login">Sign in to view orders</Link>:'Unable to verify account.'}</p>:orders.isPending?<p role="status">Loading orders…</p>:orders.isError?<p role="alert">{orders.error.message}</p>:<>{orders.data.items.length===0&&<p>No orders on this page.</p>}{orders.data.items.map(o=><article className="order-row" key={o.id}><Link to={'/orders/'+o.id}>Order {o.id.slice(0,8)}</Link><p>{new Date(o.createdAt).toLocaleDateString('en-IN')} · {label(o.status)}</p><strong>{formatPrice(o.totalPaise)}</strong></article>)}<div className="between pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button disabled={!orders.data.hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}</main>;
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
 return <main className="store"><StoreHeader/><Link to="/orders">All orders</Link>{session.isPending?<p>Checking account…</p>:!uid?<p><Link to="/login">Sign in</Link> to view order details.</p>:order.isPending?<p>Loading order…</p>:order.isError?<p role="alert">{order.error.message}</p>:o&&<div className="collection-intro"><p className="eyebrow">ORDER {o.id.slice(0,8)}</p><h1>{label(o.status)}</h1><p>Test mode only.</p>{o.items.map(i=><p key={i.id}>{i.name} · {i.size} / {i.color} × {i.quantity} — {formatPrice(i.unitPricePaise*i.quantity)}</p>)}<h2>Total: {formatPrice(o.totalPaise)}</h2><p>Deliver to: {o.address.recipient}, {o.address.line1}, {o.address.city}, {o.address.postalCode}</p>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}{o.status==='PENDING_PAYMENT'&&<div className="purchase-controls">{(o.gatewayState==='NEW'||o.gatewayState==='READY')&&<button className="primary" disabled={busy||!config.data?.paymentEnabled} onClick={()=>void pay()}>Open Razorpay test checkout</button>}{o.gatewayState==='NEW'&&<button disabled={busy} onClick={()=>void cancel()}>Cancel unpaid order</button>}{(o.gatewayState==='CREATING'||o.gatewayState==='REVIEW')&&<p role="alert">Payment setup requires reconciliation. Do not create another order.</p>}<button disabled={busy} onClick={()=>void refresh()}>Refresh order status</button></div>}</div>}</main>;
}
