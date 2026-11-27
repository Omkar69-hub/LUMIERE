import {useState,useRef,useEffect,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {AuthLayout} from '../../components/AuthLayout';
import {api,ApiError} from '../../services/api';
import {Field,PasswordFeedback} from './Fields';
import {notifySessionChange} from './session-change';
export function RecoveryPage({mode}:{mode:'forgot-password'|'reset-password'|'verify-email'}){
 const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token')||''),lock=useRef(false),alert=useRef<HTMLParagraphElement>(null),query=useQueryClient();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[touched,setTouched]=useState(false),[fields,setFields]=useState<Record<string,string>>({});
 useEffect(()=>{if(error)alert.current?.focus();},[error]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current)return;setError('');setFields({});
  if(mode==='reset-password'&&password!==confirmation){setTouched(true);setError('Please confirm the same password.');return;}
  lock.current=true;setBusy(true);
  const f=new FormData(e.currentTarget),body=mode==='forgot-password'?{email:f.get('email')}:mode==='reset-password'?{token,password,confirmPassword:confirmation}:{token};
  try{const result=await api<{message:string}>('/auth/'+mode,'POST',body);setMessage(result.message);if(mode!=='forgot-password'){history.replaceState(history.state,'',location.pathname+location.search);if(mode==='reset-password'){await query.cancelQueries();query.clear();notifySessionChange();}else await query.invalidateQueries({queryKey:['session']});}}
  catch(err){setError(err instanceof Error?err.message:'Request failed.');if(err instanceof ApiError)setFields(Object.fromEntries(err.fields.map(x=>[x.field,x.message])));}
  finally{lock.current=false;setBusy(false);}
 }
 return <AuthLayout title={mode==='forgot-password'?'Recover access.':mode==='reset-password'?'Choose a new password.':'Verify your email.'}>{message?<div className="auth-success" role="status"><span aria-hidden="true">✓</span><p>{message}</p></div>:<><p className="auth-intro">{mode==='forgot-password'?'Enter your email to request a recovery link.':mode==='reset-password'?'Set a unique passphrase for your account.':'Confirm your email using the secure link you received.'}</p><form className="auth-form" onSubmit={submit} aria-busy={busy}>
 {mode==='forgot-password'&&<Field label="Email address" name="email" type="email" required autoComplete="email" issue={fields.email}/>}
 {mode==='reset-password'&&<><Field label="New password" name="password" toggle minLength={12} maxLength={128} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} issue={fields.password}/><PasswordFeedback value={password}/><Field label="Confirm password" name="confirmPassword" toggle minLength={12} maxLength={128} required autoComplete="new-password" value={confirmation} onChange={e=>{setConfirmation(e.target.value);setTouched(true);}} issue={fields.confirmPassword||(touched&&password!==confirmation?'Passwords do not match.':undefined)}/></>}
 {mode!=='forgot-password'&&!token&&<p role="alert">Open the original link from your email.</p>}{error&&<p ref={alert} tabIndex={-1} role="alert" className="error auth-error">{error}</p>}<button className="primary auth-submit" disabled={busy||(mode!=='forgot-password'&&!token)}>{busy?<><span className="auth-spinner" aria-hidden="true"/> Please wait…</>:mode==='forgot-password'?'Request reset link':mode==='reset-password'?'Update password':'Verify email'}</button></form></>}<Link className="auth-switch" to="/login">Return to sign in</Link></AuthLayout>;
}
