import {useState,type FormEvent} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {api} from '../../services/api';
import type {Order,ReturnRequest} from './api';
export function ReturnPanel({order,uid}:{order:Order;uid:string}){
 const q=useQueryClient(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const result=useQuery({queryKey:['return',uid,order.id],queryFn:()=>api<{request:ReturnRequest|null}>('/returns/'+order.id)});
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/returns/'+order.id,'POST',{reason:new FormData(e.currentTarget).get('reason')});await q.invalidateQueries({queryKey:['return',uid,order.id]});}catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}}
 if(order.status!=='PAID'||order.fulfillment!=='DELIVERED')return null;
 return <section className="shopping-summary"><h2>Return request</h2><p className="hint">Development workflow: requests are reviewed manually. A request or approval is not a refund or guarantee of eligibility.</p>{result.isPending?<p role="status">Checking return request…</p>:result.isError?<p role="alert">Unable to load return details.</p>:result.data?.request?<><p>Status: {result.data.request.status}</p><p>{result.data.request.reason}</p>{result.data.request.reviewNote&&<p>{result.data.request.reviewNote}</p>}</>:<form onSubmit={submit}><label>Reason<textarea name="reason" required minLength={5} maxLength={500}/></label><button className="primary" disabled={busy}>Request return</button>{error&&<p className="error" role="alert">{error}</p>}</form>}</section>;
}
