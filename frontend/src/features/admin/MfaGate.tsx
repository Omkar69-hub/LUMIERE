import {useState,type FormEvent} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from '../../services/api';
export function MfaGate({uid}:{uid:string}){
 const q=useQueryClient(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const status=useQuery({queryKey:['mfa',uid],queryFn:()=>api<{enrolled:boolean;required:boolean;verified:boolean}>('/auth/admin-mfa/status')});
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/auth/admin-mfa/verify','POST',{code:new FormData(e.currentTarget).get('code')});await q.invalidateQueries({queryKey:['admin',uid,'access']});}catch(e){setError(e instanceof Error?e.message:'Verification failed.');}finally{setBusy(false);}}
 return <main className="page"><h1>Administrator verification</h1>{status.isPending?<p>Checking enrollment…</p>:status.isError?<p role="alert">Unable to verify this administrative session.</p>:!status.data.enrolled?<p>Administrator MFA must be enrolled by the local system operator before access is allowed.</p>:<form onSubmit={submit}><label>Authenticator code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label><button className="primary" disabled={busy}>Verify access</button>{error&&<p role="alert" className="error">{error}</p>}</form>}<Link to="/account">Back to account</Link></main>;
}
