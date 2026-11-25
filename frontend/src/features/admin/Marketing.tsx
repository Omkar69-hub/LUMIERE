import {MediaUpload} from './MediaUpload';
import {useState,type FormEvent} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from '../../services/api';
import {useAction,Feedback,QueryState,Pager} from './shared';
import type {Page} from './types';
type Campaign={announcement:string;headline:string;description:string;imageUrl:string|null;imageAlt:string|null};
type Product={id:string;name:string;published:boolean;featured:boolean};
export function Marketing({uid}:{uid:string}){
 const [page,setPage]=useState(1),[uploaded,setUploaded]=useState(''),action=useAction();
 const c=useQuery({queryKey:['admin',uid,'campaign'],queryFn:()=>api<Campaign>('/admin/marketing/campaign')});
 const products=useQuery({queryKey:['admin',uid,'featured',page],queryFn:()=>api<Page<Product>>('/admin/marketing/products?page='+page)});
 const n=useQuery({queryKey:['admin',uid,'newsletter'],queryFn:()=>api<{subscribers:number;deliveryEnabled:boolean}>('/admin/marketing/newsletter')});
 function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);void action.run('/marketing/campaign','PUT',{announcement:d.get('announcement'),headline:d.get('headline'),description:d.get('description'),imageUrl:String(d.get('imageUrl')??'').trim()||null,imageAlt:String(d.get('imageAlt')??'').trim()||null});}
 return <><Feedback action={action}/><section className="admin-card"><h2>Homepage campaign</h2><QueryState pending={c.isPending} error={c.error}>{c.data&&<form key={JSON.stringify(c.data)} onSubmit={save}><label>Announcement<input name="announcement" maxLength={140} required defaultValue={c.data.announcement}/></label><label>Headline<input name="headline" maxLength={120} required defaultValue={c.data.headline}/></label><label>Description<textarea name="description" maxLength={300} required defaultValue={c.data.description}/></label><MediaUpload onUploaded={setUploaded}/><label>Approved HTTPS campaign image<input key={uploaded} name="imageUrl" type="url" defaultValue={uploaded||c.data.imageUrl||''}/></label><label>Image description<input name="imageAlt" defaultValue={c.data.imageAlt??''} maxLength={250}/></label><button className="primary" disabled={action.busy}>Save campaign</button></form>}</QueryState></section><section className="admin-card"><h2>Featured collection</h2><QueryState pending={products.isPending} error={products.error}>{products.data?.items.map(p=><div className="between admin-line" key={p.id}><span>{p.name} · {p.published?'Published':'Draft'}</span><button disabled={action.busy||(!p.published&&!p.featured)} onClick={()=>void action.run('/marketing/products/'+p.id,'PATCH',{featured:!p.featured})}>{p.featured?'Remove feature':'Feature'}</button></div>)}<Pager page={page} setPage={setPage} more={!!products.data?.hasMore}/></QueryState></section><section className="admin-card"><h2>Newsletter interest</h2><QueryState pending={n.isPending} error={n.error}>{n.data&&<p>{n.data.subscribers} recorded consent requests. Mailing delivery is disabled pending approved provider and consent policies.</p>}</QueryState></section></>;
}
