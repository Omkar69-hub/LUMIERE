import {useQuery} from '@tanstack/react-query';
import {api} from '../../services/api';
import {formatPrice} from '../catalog/api';
import {useAction,Feedback,QueryState} from './shared';
type Refund={id:string;status:string;amountPaise:number;providerRefundId:string|null};
export function RefundPanel({orderId,uid}:{orderId:string;uid:string}){
 const action=useAction(),q=useQuery({queryKey:['admin',uid,'refund',orderId],queryFn:()=>api<{refund:Refund|null;enabled:boolean}>('/admin/refunds/'+orderId)});
 return <div className="admin-line"><h3>Full test refund</h3><Feedback action={action}/><QueryState pending={q.isPending} error={q.error}>{q.data&&<>{!q.data.enabled&&<p>Test refund credentials are not configured.</p>}{!q.data.refund?<button disabled={!q.data.enabled||action.busy} onClick={()=>{if(confirm('Initiate a full test-mode refund for the received return?'))void action.run('/refunds/'+orderId,'POST',{confirm:true});}}>Initiate test refund</button>:<><p>{q.data.refund.status} · {formatPrice(q.data.refund.amountPaise)}</p><p>Request reference: {q.data.refund.id}</p>{q.data.refund.status!=='PROCESSED'&&<form onSubmit={e=>{e.preventDefault();void action.run('/refunds/'+orderId+'/reconcile','POST',{refundId:new FormData(e.currentTarget).get('refundId')});}}><label>Provider refund ID<input name="refundId" defaultValue={q.data.refund.providerRefundId??''} required pattern="rfnd_[A-Za-z0-9]+"/></label><button disabled={!q.data.enabled||action.busy}>Reconcile provider status</button></form>}</>}</>}</QueryState></div>;
}
