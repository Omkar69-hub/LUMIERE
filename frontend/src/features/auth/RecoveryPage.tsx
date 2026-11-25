import { useState,type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { api } from '../../services/api';
export function RecoveryPage({mode}:{mode:'forgot-password'|'reset-password'|'verify-email'}){
 const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token')||'');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  const f=new FormData(e.currentTarget);const body=mode==='forgot-password'?{email:f.get('email')}:mode==='reset-password'?{token,password:f.get('password'),confirmPassword:f.get('confirmPassword')}:{token};
  try{const result=await api<{message:string}>('/auth/'+mode,'POST',body);setMessage(result.message);if(mode!=='forgot-password')history.replaceState(null,'',location.pathname);}catch(err){setError(err instanceof Error?err.message:'Request failed.');}finally{setBusy(false);}
 }
 return <AuthLayout title={mode==='forgot-password'?'Recover access':mode==='reset-password'?'Choose a new password':'Verify your email'}>{message?<p role="status">{message}</p>:<form onSubmit={submit}>
 {mode==='forgot-password'&&<label>Email<input name="email" type="email" required autoComplete="email"/></label>}
 {mode==='reset-password'&&<><label>New password<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password"/></label><label>Confirm password<input name="confirmPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password"/></label></>}
 {mode!=='forgot-password'&&!token&&<p role="alert">Open the original link from your email.</p>}{error&&<p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy||(mode!=='forgot-password'&&!token)}>{busy?'Please wait…':mode==='forgot-password'?'Request reset link':mode==='reset-password'?'Update password':'Verify email'}</button></form>}<Link to="/login">Return to sign in</Link></AuthLayout>;
}
