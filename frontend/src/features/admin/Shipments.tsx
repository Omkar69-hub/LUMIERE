import {useState,type FormEvent} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from '../../services/api';
import {formatPrice} from '../catalog/api';
import {AdminIcon} from './AdminIcon';
import {Feedback,Pager,QueryState,useAction} from './shared';
const stages=['UNFULFILLED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED'] as const;
type Stage=typeof stages[number];
const labels:Record<Stage,string>={UNFULFILLED:'Awaiting packing',PACKING:'Packing / dispatch queue',SHIPPED:'Shipped',OUT_FOR_DELIVERY:'Out for delivery',DELIVERED:'Delivered'};
type Shipment={id:string;createdAt:string;fulfillment:Stage;status:'PAID'|'PENDING_PAYMENT';paymentMethod:'COD'|'ONLINE';carrier:string|null;trackingNumber:string|null;totalPaise:number;user:{name:string};units:number};
type Result={items:Shipment[];hasMore:boolean;counts:Record<Stage,number>};
type History={events:{id:string;action:string;createdAt:string;actor:{name:string}}[]};
type Kind='shipping-label'|'packing-slip';
const ref=(id:string)=>'#'+id.slice(0,8).toUpperCase();
const placed=(s:string)=>new Date(s).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'});
const eligible=(s:Shipment)=>s.fulfillment!=='DELIVERED';
export function Shipments({uid,onOrder}:{uid:string;onOrder:(id:string)=>void}){
 const [page,setPage]=useState(1),[stage,setStage]=useState<Stage|''>(''),[filters,setFilters]=useState({q:'',carrier:'',from:'',to:''}),[selected,setSelected]=useState<string[]>([]),[active,setActive]=useState(''),[busy,setBusy]=useState<Kind|null>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),action=useAction();
 const q=useQuery({queryKey:['admin',uid,'shipments',page,stage,filters],queryFn:()=>api<Result>('/admin/shipments?'+new URLSearchParams({page:String(page),...(stage?{stage}:{}),...Object.fromEntries(Object.entries(filters).filter(([,v])=>v))}))});
 const history=useQuery({queryKey:['admin',uid,'shipment-history',active],queryFn:()=>api<History>('/admin/shipments/'+encodeURIComponent(active)+'/history'),enabled:!!active});
 const rows=q.data?.items??[],current=rows.find(s=>s.id===active),ids=selected.filter(id=>rows.some(s=>s.id===id&&eligible(s)));
 const reset=()=>{setSelected([]);setActive('');setMessage('');setError('');};
 function changeStage(value:Stage|''){setStage(value);setPage(1);reset();}
 function search(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setFilters({q:String(f.get('q')??'').trim(),carrier:String(f.get('carrier')??'').trim(),from:String(f.get('from')??''),to:String(f.get('to')??'')});setPage(1);reset();}
 function toggle(id:string){setSelected(v=>v.includes(id)?v.filter(x=>x!==id):v.length<10?[...v,id]:v);}
 async function download(kind:Kind){
  if(busy||!ids.length)return;setBusy(kind);setMessage('');setError('');
  try{const res=await fetch('/api/admin/shipments/documents',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,kind})});
   if(!res.ok){const b=await res.json().catch(()=>null);throw new Error(b?.error||'Unable to prepare documents.');}
   if(!res.headers.get('Content-Type')?.startsWith('application/zip'))throw new Error('Unexpected document response.');
   const url=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=url;a.download='lumiere-test-'+kind+'s.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);setMessage('ZIP prepared for '+ids.length+' selected order(s).');
  }catch(e){setError(e instanceof Error?e.message:'Download failed.');}finally{setBusy(null);}
 }
 function advance(s:Shipment,next:Stage,extra:Record<string,unknown>={}){void action.run('/orders/'+s.id+'/fulfillment','PATCH',{status:next,...extra});}
 return <><p className="hint">Manual test shipment operations. No courier is contacted, and no real shipment is booked. Packing is the dispatch queue, not proof that an order is packed.</p>
 <Feedback action={action}/><QueryState pending={q.isPending} error={q.error}>{q.data&&<div className="admin-metrics shipment-metrics">{stages.map(s=><article className="admin-card admin-kpi" key={s}><AdminIcon name="Shipments"/><p>{labels[s]}</p><strong>{q.data!.counts[s]}</strong><button className="admin-inline-link" onClick={()=>changeStage(s)}>View queue</button></article>)}</div>}</QueryState>
 <section className="admin-card"><h2>Shipment workspace</h2><p className="hint">All-time counts above exclude cancelled and unpaid online orders. Filters apply to the list below.</p>
 <form className="admin-form-grid" onSubmit={search}><label>Search shipments<input name="q" placeholder="Order ID, tracking or customer" maxLength={100}/></label><label>Courier<input name="carrier" maxLength={100} placeholder="Courier name"/></label><label>Placed from (IST)<input name="from" type="date"/></label><label>Placed to (IST)<input name="to" type="date"/></label><button className="primary">Apply filters</button></form>
 <div className="admin-filter-grid"><label>Shipment stage<select value={stage} onChange={e=>changeStage(e.target.value as Stage|'')}><option value="">All shipments</option>{stages.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label></div>
 <div className="admin-subcard"><h3>Bulk documents</h3><p className="hint">Select up to 10 active orders on this page. Each ZIP contains separate Heritage Edition PDFs; no official courier labels.</p><div className="admin-actions"><strong>{ids.length} selected</strong><button type="button" disabled={!!busy||!rows.some(eligible)} onClick={()=>setSelected(rows.filter(eligible).slice(0,10).map(s=>s.id))}>Select up to 10</button><button type="button" disabled={!!busy||!ids.length} onClick={()=>setSelected([])}>Clear</button><button disabled={!!busy||!ids.length} onClick={()=>void download('shipping-label')}>{busy==='shipping-label'?'Preparing ZIP…':'Download labels (ZIP)'}</button><button disabled={!!busy||!ids.length} onClick={()=>void download('packing-slip')}>{busy==='packing-slip'?'Preparing ZIP…':'Download packing slips (ZIP)'}</button></div>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}</div>
 <QueryState pending={q.isPending} error={q.error}>{rows.length===0?<p className="admin-empty">No shipments match these filters.</p>:<div className="admin-table-scroll"><table className="admin-table admin-card-table admin-shipments-table" role="table"><thead><tr>{['Order / select','Customer','Stage','Courier / tracking','Units','Payment','Action'].map(s=><th scope="col" key={s}>{s}</th>)}</tr></thead><tbody>{rows.map(s=><tr key={s.id}><td data-label="Order / select"><label className="shipment-select"><input type="checkbox" aria-label={'Select '+ref(s.id)} checked={ids.includes(s.id)} disabled={!!busy||!eligible(s)||(!ids.includes(s.id)&&ids.length>=10)} onChange={()=>toggle(s.id)}/><strong>{ref(s.id)}</strong></label><small>{placed(s.createdAt)}</small></td><td data-label="Customer">{s.user.name}</td><td data-label="Stage"><span className={'admin-status '+(s.fulfillment==='DELIVERED'?'good':'')}>{labels[s.fulfillment]}</span></td><td data-label="Courier / tracking">{s.carrier??'Not assigned'}<small>{s.trackingNumber??'No tracking'}</small></td><td data-label="Units">{s.units}</td><td data-label="Payment">{s.paymentMethod} · {s.status==='PAID'?'Paid (test)':'Payable on delivery'}<small>{formatPrice(s.totalPaise)}</small></td><td data-label="Action"><button onClick={()=>setActive(s.id)}>Manage shipment</button></td></tr>)}</tbody></table></div>}<Pager page={page} more={!!q.data?.hasMore} setPage={p=>{setPage(p);reset();}}/></QueryState></section>
 {current&&<section className="admin-card"><div className="between"><h2>Shipment {ref(current.id)}</h2><button onClick={()=>onOrder(current.id)}>View full order</button></div><p>{labels[current.fulfillment]} · {current.units} units</p>
 {current.fulfillment==='UNFULFILLED'&&<button disabled={action.busy} onClick={()=>advance(current,'PACKING')}>Mark packing</button>}
 {current.fulfillment==='PACKING'&&<form key={current.id} className="admin-form-grid" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);advance(current,'SHIPPED',{carrier:f.get('carrier'),trackingNumber:f.get('trackingNumber')});}}><label>Carrier<input name="carrier" required maxLength={100}/></label><label>Tracking number<input name="trackingNumber" required maxLength={100}/></label><button disabled={action.busy}>Mark shipped</button></form>}
 {current.fulfillment==='SHIPPED'&&<button disabled={action.busy} onClick={()=>advance(current,'OUT_FOR_DELIVERY')}>Mark out for delivery</button>}
 {current.fulfillment==='OUT_FOR_DELIVERY'&&<button disabled={action.busy} onClick={()=>{const cod=current.paymentMethod==='COD';if(!cod||confirm('Confirm simulated cash collection and delivery? No real money is collected.'))advance(current,'DELIVERED',cod?{cashCollected:true}:{});}}>{current.paymentMethod==='COD'?'Confirm test cash collection and delivery':'Mark delivered'}</button>}
 <div className="admin-subcard"><h3>Shipment history</h3><p className="hint">Recorded administrative transitions, not live courier scans.</p><QueryState pending={history.isPending} error={history.error}>{history.data?.events.length===0?<p>No fulfillment changes recorded yet.</p>:history.data?.events.map(e=><div className="admin-line" key={e.id}><strong>{e.action.replace(/^FULFILLMENT_/,'').replaceAll('_',' ')}</strong><p>{e.actor.name} · {new Date(e.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p></div>)}</QueryState></div></section>}
 </>;
}
