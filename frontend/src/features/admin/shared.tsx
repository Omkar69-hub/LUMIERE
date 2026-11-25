import {useState,type ReactNode,type FormEvent} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {api} from '../../services/api';
export function useAction(){
 const q=useQueryClient(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function run(path:string,method:string,body?:unknown){if(busy)return false;setBusy(true);setError('');setNotice('');try{await api('/admin'+path,method,body);await q.invalidateQueries({queryKey:['admin']});setNotice('Changes saved.');return true;}catch(e){setError(e instanceof Error?e.message:'Request failed.');return false;}finally{setBusy(false);}}
 return {busy,error,notice,run};
}
export type Action=ReturnType<typeof useAction>;
export function Feedback({action}:{action:Action}){return <>{action.error&&<p className="error" role="alert">{action.error}</p>}{action.notice&&<p role="status">{action.notice}</p>}</>}
export function QueryState({pending,error,children}:{pending:boolean;error:Error|null;children:ReactNode}){return pending?<p role="status">Loading…</p>:error?<p className="error" role="alert">{error.message}</p>:<>{children}</>}
export function Pager({page,setPage,more}:{page:number;setPage:(v:number)=>void;more:boolean}){return <div className="between pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page}</span><button disabled={!more} onClick={()=>setPage(page+1)}>Next</button></div>}
export function Search({onSearch,placeholder}:{onSearch:(q:string)=>void;placeholder:string}){function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();onSearch(String(new FormData(e.currentTarget).get('q')??''));}return <form className="admin-search" onSubmit={submit}><label>Search<input name="q" maxLength={100} placeholder={placeholder}/></label><button className="primary">Search</button></form>}
export const money=(v:FormDataEntryValue|null)=>Math.round(Number(v)*100);
