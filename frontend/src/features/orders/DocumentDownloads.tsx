import {useState} from 'react';
type Kind='summary'|'shipping-label'|'packing-slip';
const labels:Record<Kind,string>={summary:'Download order summary (PDF)','shipping-label':'Download test shipping label','packing-slip':'Download packing slip'};
export function DocumentDownloads({id,admin=false,shipping=false}:{id:string;admin?:boolean;shipping?:boolean}){
 const [busy,setBusy]=useState<Kind|null>(null),[error,setError]=useState('');
 async function download(kind:Kind){if(busy)return;setBusy(kind);setError('');try{
  const res=await fetch('/api/'+(admin?'admin/':'')+'orders/'+encodeURIComponent(id)+'/documents/'+kind,{credentials:'same-origin',cache:'no-store'});
  if(!res.ok){const body=await res.json().catch(()=>null);throw new Error(body?.error||'Unable to download the document.');}
  if(!res.headers.get('Content-Type')?.startsWith('application/pdf'))throw new Error('Unexpected document response.');
  const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='lumiere-'+kind+'-'+id+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }catch(e){setError(e instanceof Error?e.message:'Download failed.');}finally{setBusy(null);}}
 const kinds:Kind[]=admin&&shipping?['summary','shipping-label','packing-slip']:['summary'];
 return <div className={admin?'admin-subcard':'order-card'}><h3>Order documents</h3><p className="hint">Development test only. Not a tax invoice or carrier-issued label.</p><div className={admin?'admin-actions':'order-actions'}>{kinds.map(k=><button type="button" key={k} disabled={!!busy} className={admin?undefined:'order-outline'} onClick={()=>void download(k)}>{busy===k?'Preparing PDF…':labels[k]}</button>)}</div>{admin&&!shipping&&<p className="hint">Shipping documents require an active confirmed order.</p>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
