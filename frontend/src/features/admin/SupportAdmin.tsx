import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from '../../services/api';
import {useAction,Feedback,QueryState,Pager} from './shared';
import type {Page} from './types';
import type {Ticket} from '../../pages/Support';
export function SupportAdmin({uid}:{uid:string}){
 const [page,setPage]=useState(1),[status,setStatus]=useState('OPEN'),action=useAction();
 const q=useQuery({queryKey:['admin',uid,'support',page,status],queryFn:()=>api<Page<Ticket&{user:{name:string;email:string}}>>('/admin/support?'+new URLSearchParams({page:String(page),...(status?{status}:{})}))});
 return <section className="admin-card"><h2>Customer care requests</h2><Feedback action={action}/><label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All</option><option>OPEN</option><option>ANSWERED</option><option>CLOSED</option></select></label><QueryState pending={q.isPending} error={q.error}>{q.data?.items.length===0&&<p>No requests found.</p>}{q.data?.items.map(t=><article className="admin-line" key={t.id}><h3>{t.subject} · {t.status}</h3><p>{t.user.name} · {t.user.email}</p><p>{t.message}</p>{t.response&&<p>Response: {t.response}</p>}{t.status!=='CLOSED'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void action.run('/support/'+t.id,'PATCH',{status:f.get('status'),response:f.get('response')});}}><label>Response<textarea name="response" required minLength={3} maxLength={2000} defaultValue={t.response??''}/></label><label>Disposition<select name="status">{t.status==='OPEN'&&<option>ANSWERED</option>}<option>CLOSED</option></select></label><button disabled={action.busy}>Save response</button></form>}</article>)}<Pager page={page} setPage={setPage} more={!!q.data?.hasMore}/></QueryState></section>;
}
