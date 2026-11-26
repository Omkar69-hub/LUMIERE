import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {api,ApiError,type User} from '../services/api';
import {Inventory} from '../features/admin/Inventory';
import {AdminIcon} from '../features/admin/AdminIcon';
import {Catalog,Taxonomies} from '../features/admin/Catalog';
import {Dashboard,Customers,AdminOrders,Audit} from '../features/admin/Operations';
import {SupportAdmin} from '../features/admin/SupportAdmin';
import {MfaGate} from '../features/admin/MfaGate';
import {Commerce} from '../features/admin/Commerce';
import {Marketing} from '../features/admin/Marketing';
import {StudioEmblem} from '../features/experience/StudioEmblem';
import '../styles/admin.css';
import '../styles/studio-motion.css';
const tabs=['Overview','Orders','Products','Inventory','Customers','Taxonomy','Marketing','Returns','Support','Activity'] as const;
const names:Partial<Record<typeof tabs[number],string>>={Taxonomy:'Categories & brands'};
type Tab=typeof tabs[number];
export function Admin(){
 const session=useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false,staleTime:0,refetchOnMount:'always'}),uid=session.data?.user.id;
 const gate=useQuery({queryKey:['admin',uid,'access'],queryFn:()=>api<{authorized:boolean}>('/admin/access'),enabled:!!uid&&session.data?.user.role==='ADMIN',retry:false,refetchOnMount:'always',staleTime:0});
 const [tab,setTab]=useState<Tab>('Overview'),[menu,setMenu]=useState(false),[orderId,setOrderId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),client=useQueryClient(),navigate=useNavigate();
 async function logout(){if(busy)return;setBusy(true);try{await api('/auth/logout','POST');await client.cancelQueries();client.clear();navigate('/login',{replace:true});}catch(e){setError(e instanceof Error?e.message:'Sign out failed.');}finally{setBusy(false);}}
 if(session.isPending||session.isFetching)return <main className="page"><p role="status">Checking administrator session…</p></main>;
 if(session.error instanceof ApiError&&session.error.status===401)return <Navigate to="/login" replace/>;
 if(!uid||session.isError)return <main className="page"><p role="alert">Unable to verify session.</p><Link to="/account">Account</Link></main>;
 if(session.data?.user.role!=='ADMIN')return <main className="page"><h1>Access denied</h1><p>This area requires administrator authorization.</p><Link to="/account">Back to account</Link></main>;
 if(gate.isPending||gate.isFetching)return <main className="page"><p role="status">Checking admin permissions…</p></main>;
 if(gate.error instanceof ApiError&&gate.error.status===403&&gate.error.message.includes('MFA'))return <MfaGate uid={uid}/>;
 if(gate.isError||!gate.data?.authorized)return <main className="page"><h1>Access denied</h1><p>Unable to authorize this administrative session.</p><Link to="/account">Back to account</Link></main>;
 function choose(t:Tab,id=''){setTab(t);setOrderId(id);setMenu(false);window.scrollTo(0,0);}
 return <main className="admin-shell"><aside className="admin-sidebar"><Link className="wordmark" to="/">LUMIÈRE</Link><p className="admin-studio-label">ADMIN STUDIO</p><button className="admin-menu-toggle" aria-expanded={menu} aria-controls="admin-sections" onClick={()=>setMenu(v=>!v)}><AdminIcon name="Menu"/> Sections</button><nav id="admin-sections" className={'admin-nav '+(menu?'is-open':'')} aria-label="Admin sections">{tabs.map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>choose(t)}><AdminIcon name={t}/><span>{names[t]??t}</span></button>)}</nav><div className="admin-sidebar-footer"><Link to="/">View storefront</Link><button disabled={busy} onClick={()=>void logout()}><AdminIcon name="Logout"/> Sign out</button></div></aside><div className="admin-workspace"><header className="admin-header"><div><p className="eyebrow">STORE MANAGEMENT</p><span className="admin-test-label">Development · Test mode</span></div><div className="admin-actions"><button className="admin-header-support" aria-label="Open customer care" onClick={()=>choose('Support')}><AdminIcon name="Support"/> Support</button><Link className="admin-account-link" to="/account"><AdminIcon name="Customers"/><span>Account</span></Link></div></header><div className="admin-body" key={tab}><div className={tab==='Overview'?'admin-page-heading studio-hero studio-hero--operations':'admin-page-heading studio-section-heading'}><div className="studio-hero-copy"><p className="eyebrow">PRIVATE OPERATIONS / LUMIÈRE</p><h1>{names[tab]??tab}</h1>{tab==='Overview'&&<><p className="studio-hero-description">The house, in focus. Manage every detail of your store.</p><span className="studio-test-indicator"><span aria-hidden="true"/> Development · Test mode</span></>}</div>{tab==='Overview'&&<StudioEmblem variant="operations"/>}</div>{error&&<p role="alert" className="error">{error}</p>}{tab==='Overview'?<Dashboard uid={uid} onOrders={id=>choose('Orders',id)} onInventory={()=>choose('Inventory')} onReturns={()=>choose('Returns')} onSupport={()=>choose('Support')}/>:tab==='Products'?<Catalog uid={uid}/>:tab==='Inventory'?<Inventory uid={uid}/>:tab==='Taxonomy'?<Taxonomies uid={uid}/>:tab==='Customers'?<Customers uid={uid}/>:tab==='Orders'?<AdminOrders key={orderId} uid={uid} initialOrder={orderId}/>:tab==='Marketing'?<><Marketing uid={uid}/><Commerce uid={uid} mode="coupons"/></>:tab==='Returns'?<Commerce uid={uid} mode="returns"/>:tab==='Support'?<SupportAdmin uid={uid}/>:<Audit uid={uid}/>}</div></div></main>;
}
