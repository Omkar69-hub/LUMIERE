import {useState,useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from '../../services/api';
export function MediaUpload({onUploaded}:{onUploaded:(url:string)=>void}){
 const conf=useQuery({queryKey:['admin','media-config'],queryFn:()=>api<{enabled:boolean;maxBytes:number}>('/admin/media/configuration')});
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function upload(){const file=input.current?.files?.[0];if(!file||busy)return;setError('');setMessage('');
 if(!conf.data?.enabled||file.size>conf.data.maxBytes||!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Select a JPEG, PNG or WebP image up to 5 MB.');return;}
 setBusy(true);try{const res=await fetch('/api/admin/media/upload',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});const data=await res.json();if(!res.ok)throw new Error(data.error||'Upload failed.');onUploaded(data.url);setMessage('Upload complete. Save the product or campaign to use it.');if(input.current)input.current.value='';}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);}}
 return <div className="admin-line"><label>Upload licensed image<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={!conf.data?.enabled||busy}/></label><button type="button" disabled={!conf.data?.enabled||busy} onClick={()=>void upload()}>{busy?'Uploading…':'Upload image'}</button>{!conf.data?.enabled&&<p className="hint">Cloud image provider is not configured.</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
