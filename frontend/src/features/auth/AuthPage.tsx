import {useState,useRef,useEffect,type FormEvent} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {AuthLayout} from '../../components/AuthLayout';
import {api,ApiError,type User} from '../../services/api';
import {Field,PasswordFeedback} from './Fields';
export function AuthPage({mode}:{mode:'login'|'register'}){
 const signup=mode==='register',navigate=useNavigate(),query=useQueryClient(),lock=useRef(false),alert=useRef<HTMLParagraphElement>(null);
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[email,setEmail]=useState(''),[emailTouched,setEmailTouched]=useState(false),[confirmTouched,setConfirmTouched]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({});
 const mismatch=signup&&confirmTouched&&confirmation!==password?'Passwords do not match.':undefined;
 const invalidEmail=emailTouched&&email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?'Enter a valid email address.':undefined;
 useEffect(()=>{if(error)alert.current?.focus();},[error]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current)return;setError('');setFields({});
  if(signup&&password!==confirmation){setConfirmTouched(true);setError('Please confirm the same password.');return;}
  lock.current=true;setBusy(true);
  const f=new FormData(e.currentTarget),body=signup?{name:f.get('name'),email:f.get('email'),mobile:f.get('mobile'),password,confirmPassword:confirmation,terms:f.has('terms')}:{email:f.get('email'),password,remember:f.has('remember')};
  try{const result=await api<{user:User}>('/auth/'+mode,'POST',body);query.clear();query.setQueryData(['session'],result);navigate('/account',{replace:true});}
  catch(err){setError(err instanceof Error?err.message:'Request failed.');if(err instanceof ApiError)setFields(Object.fromEntries(err.fields.map(x=>[x.field,x.message])));}
  finally{lock.current=false;setBusy(false);}
 }
 const clear=(name:string)=>setFields(x=>{const copy={...x};delete copy[name];return copy;});
 return <AuthLayout title={signup?'Create your account':'Welcome back.'}><p className="auth-intro">{signup?'Join our world of considered essentials.':'Enter your private LUMIÈRE space.'}</p><form className="auth-form" onSubmit={submit} aria-busy={busy}>
 {signup&&<><Field label="Full name" name="name" autoComplete="name" required minLength={2} maxLength={100} issue={fields.name} onChange={()=>clear('name')}/><Field label="Mobile number" name="mobile" type="tel" inputMode="tel" autoComplete="tel" required pattern="[+]?[0-9]{10,15}" issue={fields.mobile} onChange={()=>clear('mobile')}/></>}
 <Field label="Email address" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>{setEmail(e.target.value);clear('email');}} onBlur={()=>setEmailTouched(true)} issue={fields.email||invalidEmail}/>
 <Field label="Password" name="password" toggle autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128} value={password} onChange={e=>{setPassword(e.target.value);clear('password');}} issue={fields.password}/>
 {signup?<><PasswordFeedback value={password}/><Field label="Confirm password" name="confirmPassword" toggle autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e=>{setConfirmation(e.target.value);clear('confirmPassword');}} onBlur={()=>setConfirmTouched(true)} issue={fields.confirmPassword||mismatch}/><label className="check auth-check"><input name="terms" type="checkbox" required/><span>I accept the <Link to="/terms" target="_blank" rel="noopener">development terms</Link>.</span></label></>:<div className="between auth-options"><label className="check auth-check"><input type="checkbox" name="remember"/> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>}
 {error&&<p ref={alert} tabIndex={-1} role="alert" className="error auth-error">{error}</p>}<button disabled={busy} className="primary auth-submit">{busy?<><span className="auth-spinner" aria-hidden="true"/> Please wait…</>:<>{signup?'Create account':'Sign in'} <span aria-hidden="true">↗</span></>}</button></form><p className="auth-switch">{signup?'Already a member?':'New to LUMIÈRE?'} <Link to={signup?'/login':'/signup'}>{signup?'Sign in':'Create an account'}</Link></p></AuthLayout>;
}
