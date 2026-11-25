import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {api,ApiError,type User} from '../services/api';
import {Catalog,Taxonomies} from '../features/admin/Catalog';
import {Dashboard,Customers,AdminOrders,Audit} from '../features/admin/Operations';
import {Marketing} from '../features/admin/Marketing';
import '../styles/admin.css';
const tabs=['Overview','Products','Taxonomy','Customers','Orders','Marketing','Activity'] as const;
type Tab=typeof tabs[number];
export function Admin(){
 const session=useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false,staleTime:0,refetchOnMount:'always'}),uid=session.data?.user.id;
 const gate=useQuery({queryKey:['admin',uid,'access'],queryFn:()=>api<{authorized:boolean}>('/admin/access'),enabled:!!uid&&session.data?.user.role==='ADMIN',retry:false,refetchOnMount:'always',staleTime:0});
 const [tab,setTab]=useState<Tab>('Overview'),[busy,setBusy]=useState(false),[error,setError]=useState(''),client=useQueryClient(),navigate=useNavigate();
 async function logout(){if(busy)return;setBusy(true);try{await api('/auth/logout','POST');client.clear();navigate('/login',{replace:true});}catch(e){setError(e instanceof Error?e.message:'Sign out failed.');}finally{setBusy(false);}}
 if(session.isPending||session.isFetching)return <main className="page"><p role="status">Checking administrator session…</p></main>;
 if(session.error instanceof ApiError&&session.error.status===401)return <Navigate to="/login" replace/>;
 if(!uid||session.isError)return <main className="page"><p role="alert">Unable to verify session.</p><Link to="/account">Account</Link></main>;
 if(session.data?.user.role!=='ADMIN')return <main className="page"><h1>Access denied</h1><p>This area requires administrator authorization.</p><Link to="/account">Back to account</Link></main>;
 if(gate.isPending||gate.isFetching)return <main className="page"><p role="status">Checking admin permissions…</p></main>;
 if(gate.isError||!gate.data?.authorized)return <main className="page"><h1>Access denied</h1><p>Unable to authorize this administrative session.</p><Link to="/account">Back to account</Link></main>;
 return <main className="admin-shell"><header className="admin-header"><Link className="wordmark" to="/">LUMIÈRE</Link><span>Atelier administration · Test mode</span><div className="admin-actions"><Link to="/account">Account</Link><button disabled={busy} onClick={()=>void logout()}>Sign out</button></div></header><nav className="admin-nav" aria-label="Admin sections">{tabs.map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>setTab(t)}>{t}</button>)}</nav><div className="admin-body"><p className="eyebrow">PRIVATE OPERATIONS</p><h1>{tab}</h1>{error&&<p role="alert" className="error">{error}</p>}{tab==='Overview'?<Dashboard uid={uid}/>:tab==='Products'?<Catalog uid={uid}/>:tab==='Taxonomy'?<Taxonomies uid={uid}/>:tab==='Customers'?<Customers uid={uid}/>:tab==='Orders'?<AdminOrders uid={uid}/>:tab==='Marketing'?<Marketing uid={uid}/>:<Audit uid={uid}/>}</div></main>;
}
