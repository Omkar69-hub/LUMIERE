import { useState,type FormEvent } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Link,Navigate,useNavigate } from 'react-router-dom';
import { api,ApiError,type User } from '../services/api';
type Address={id:string;recipient:string;line1:string;city:string;state:string;postalCode:string};
export function Account(){
 const q=useQueryClient(),navigate=useNavigate(),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const session=useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false});
 const addresses=useQuery({queryKey:['addresses',session.data?.user.id],queryFn:()=>api<Address[]>('/addresses'),enabled:!!session.data});
 async function action(fn:()=>Promise<unknown>,success:string){if(busy)return;setBusy(true);setError('');setMessage('');try{await fn();setMessage(success);}catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}}
 if(session.isPending)return <main className="page"><p role="status">Loading your account…</p></main>;
 if(session.error instanceof ApiError&&session.error.status===401)return <Navigate to="/login" replace/>;
 if(!session.data)return <main className="page"><p role="alert">Unable to load your account.</p><button onClick={()=>void session.refetch()}>Retry</button></main>;
 const user=session.data.user;
 function profile(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);void action(async()=>{const result=await api('/users/me','PATCH',{name:f.get('name'),mobile:f.get('mobile')});q.setQueryData(['session'],result);},'Profile saved.');}
 function address(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,f=new FormData(form);void action(async()=>{await api('/addresses','POST',Object.fromEntries(f));await q.invalidateQueries({queryKey:['addresses',user.id]});form.reset();},'Address saved.');}
 return <main className="page"><header className="between"><Link className="wordmark" to="/">LUMIÈRE</Link><button disabled={busy} onClick={()=>void action(async()=>{await api('/auth/logout','POST');q.clear();navigate('/login',{replace:true});},'Signed out.')}>Sign out</button></header><h1>Welcome, {user.name}.</h1><nav aria-label="Account shopping"><Link to="/orders">Order history</Link> · <Link to="/wishlist">Wishlist</Link> · <Link to="/cart">Shopping bag</Link></nav><p>{user.email}</p>{!user.emailVerifiedAt&&<p>Email not verified. <button disabled={busy} onClick={()=>void action(()=>api('/auth/resend-verification','POST'),'Verification link requested.')}>Request verification</button></p>}{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
 <section><h2>Personal information</h2><form onSubmit={profile} key={user.id}><label>Name<input name="name" defaultValue={user.name} required/></label><label>Mobile<input name="mobile" defaultValue={user.mobile} required/></label><button className="primary" disabled={busy}>Save profile</button></form></section>
 <section><h2>Saved addresses</h2>{addresses.isPending?<p>Loading addresses…</p>:addresses.isError?<p role="alert">Unable to load addresses.</p>:addresses.data?.map(a=><article key={a.id}><p>{a.recipient} — {a.line1}, {a.city}, {a.state} {a.postalCode}</p><button disabled={busy} onClick={()=>void action(async()=>{await api('/addresses/'+a.id,'DELETE');await q.invalidateQueries({queryKey:['addresses',user.id]});},'Address removed.')}>Remove</button></article>)}<form onSubmit={address}>{[['recipient','Recipient'],['line1','Street address'],['city','City'],['state','State'],['postalCode','PIN code']].map(([name,label])=><label key={name}>{label}<input name={name} required/></label>)}<button className="primary" disabled={busy}>Save address</button></form></section></main>;
}
