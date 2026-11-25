import { useState,type FormEvent } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AuthLayout } from '../../components/AuthLayout';
import { api,type User } from '../../services/api';
export function AuthPage({mode}:{mode:'login'|'register'}){
 const signup=mode==='register', navigate=useNavigate(),query=useQueryClient();
 const [show,setShow]=useState(false),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const strength=password.length>=16?'Long':password.length>=12?'Meets minimum':'Too short';
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  const f=new FormData(e.currentTarget);
  const body=signup?{name:f.get('name'),email:f.get('email'),mobile:f.get('mobile'),password,confirmPassword:f.get('confirmPassword'),terms:f.has('terms')}:{email:f.get('email'),password,remember:f.has('remember')};
  try{const result=await api<{user:User}>('/auth/'+mode,'POST',body);query.setQueryData(['session'],result);navigate('/account',{replace:true});}catch(err){setError(err instanceof Error?err.message:'Request failed.');}finally{setBusy(false);}
 }
 return <AuthLayout title={signup?'Create your account':'Welcome back'}><p>{signup?'Join our world of considered essentials.':'Enter your private LUMIÈRE space.'}</p><form onSubmit={submit}>
 {signup&&<><label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Mobile number<input name="mobile" type="tel" autoComplete="tel" required pattern="[+0-9]{10,16}"/></label></>}
 <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
 <label>Password<div className="password"><input name="password" type={show?'text':'password'} autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="text-button" onClick={()=>setShow(!show)} aria-pressed={show}>{show?'Hide':'Show'}</button></div></label>
 {signup?<><p className="hint" aria-live="polite">Length: {strength}</p><label>Confirm password<input name="confirmPassword" type={show?'text':'password'} autoComplete="new-password" required minLength={12}/></label><label className="check"><input name="terms" type="checkbox" required/> I accept the <Link to="/terms" target="_blank">terms</Link>.</label></>:<div className="between"><label className="check"><input type="checkbox" name="remember"/> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>}
 {error&&<p role="alert" className="error">{error}</p>}<button disabled={busy} className="primary">{busy?'Please wait…':signup?'Create account':'Sign in'}</button></form><p>{signup?'Already a member?':'New to LUMIÈRE?'} <Link to={signup?'/login':'/signup'}>{signup?'Sign in':'Create an account'}</Link></p></AuthLayout>;
}
