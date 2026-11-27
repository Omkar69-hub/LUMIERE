import {useState,type FormEvent} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api,type User} from '../../services/api';
export function AdminProfile({user}:{user:User}){
 const q=useQueryClient(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function run(fn:()=>Promise<unknown>,success:string){if(busy)return;setBusy(true);setMessage('');setError('');try{await fn();setMessage(success);}catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}}
 function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{const data=await api<{user:User}>('/users/me','PATCH',{name:f.get('name'),mobile:f.get('mobile')});q.setQueryData(['session'],data);},'Administrator profile saved.');}
 return <section className="admin-card"><h2>Administrator profile</h2><p className="hint">Administrative identity only. Customer records are managed in Customers and Orders.</p><form className="admin-form-grid" onSubmit={save} key={user.id+user.name+user.mobile}><label>Name<input name="name" required minLength={2} maxLength={100} defaultValue={user.name}/></label><label>Mobile<input name="mobile" type="tel" pattern="[+]?[0-9]{10,15}" required defaultValue={user.mobile}/></label><label>Email address<input value={user.email} type="email" readOnly/></label><button disabled={busy}>Save profile</button></form><p>{user.emailVerifiedAt?'Verified email':'Email not verified'}</p>{!user.emailVerifiedAt&&<button disabled={busy} onClick={()=>void run(()=>api('/auth/resend-verification','POST'),'Verification link requested.')}>Request verification</button>}<p><Link to="/forgot-password">Password recovery</Link></p>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}</section>;
}
