import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link,useParams } from 'react-router-dom';
import { StoreHeader } from '../components/StoreHeader';
import { getProduct,formatPrice,type Product } from '../features/catalog/api';
function ProductView({p}:{p:Product}){
 const [image,setImage]=useState(0),[selected,setSelected]=useState('');
 const v=p.variants.find(x=>x.id===selected);
 return <div className="detail-layout"><section><div className="detail-photo">{p.images[image]?<img src={p.images[image].url} alt={p.images[image].alt}/>:<p>Image unavailable</p>}</div><div className="thumbnail-row">{p.images.map((img,i)=><button key={i} type="button" aria-label={'View image '+(i+1)} aria-pressed={image===i} onClick={()=>setImage(i)}><img src={img.url} alt={img.alt}/></button>)}</div></section><section className="detail-copy"><p className="eyebrow">{p.brand.name} / {p.category.name}</p><h1>{p.name}</h1><p className="detail-price">{formatPrice(p.pricePaise)}</p><p>{p.description}</p><fieldset><legend>Choose size and colour</legend><div className="variant-grid">{p.variants.map(item=><label key={item.id} className="variant-option"><input type="radio" name="variant" value={item.id} checked={selected===item.id} disabled={!item.available} onChange={()=>setSelected(item.id)}/>{item.size} / {item.color}{!item.available?' — sold out':''}</label>)}</div></fieldset>{v&&<p role="status">SKU: {v.sku} · In stock</p>}<p className="hint">Online purchasing is not yet enabled.</p><Link to="/shop">Back to collection</Link></section></div>;
}
export function ProductDetail(){const {slug=''}=useParams();const product=useQuery({queryKey:['product',slug],queryFn:()=>getProduct(slug),enabled:!!slug});return <main className="store"><StoreHeader/>{product.isPending?<p role="status">Loading product…</p>:product.isError?<p role="alert">{product.error.message}</p>:<ProductView key={product.data.id} p={product.data}/>}</main>}
