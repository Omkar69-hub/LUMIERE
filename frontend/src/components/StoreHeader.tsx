import {useRef,useState,type FormEvent} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {MotionLink} from '../features/experience/MotionLink';
import {useQuery} from '@tanstack/react-query';
import {api,type User} from '../services/api';
export function StoreHeader(){
 const dialog=useRef<HTMLDialogElement>(null),searchButton=useRef<HTMLButtonElement>(null),menuButton=useRef<HTMLButtonElement>(null),[mode,setMode]=useState<'search'|'menu'>('search'),navigate=useNavigate();
 const session=useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false});
 const admin=session.data?.user.role==='ADMIN';
 function open(next:'search'|'menu'){setMode(next);dialog.current?.showModal();}
 function close(){dialog.current?.close();}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const value=String(new FormData(e.currentTarget).get('q')??'').trim();close();navigate('/shop'+(value?'?'+new URLSearchParams({q:value}):''));}
 return <header className="store-header premium-nav"><button ref={menuButton} className="nav-menu" type="button" onClick={()=>open('menu')} aria-label="Open navigation">Menu</button><nav className="nav-primary" aria-label="Collections"><MotionLink to="/shop">Shop</MotionLink><MotionLink to="/shop?featured=true">The edit</MotionLink></nav><Link className="wordmark" to="/" aria-label="LUMIÈRE home">LUMIÈRE</Link><nav className="nav-tools" aria-label="Account and shopping"><button ref={searchButton} type="button" onClick={()=>open('search')}>Search</button>{admin?<Link to="/admin">Admin console</Link>:<><Link to="/wishlist">Wishlist</Link><Link className="nav-bag" to="/cart">Bag</Link><Link to="/account">Account</Link></>}</nav><dialog className="nav-dialog" ref={dialog} onClose={()=>{(mode==='search'?searchButton:menuButton).current?.focus();}} aria-label={mode==='search'?'Search collection':'Navigation'}><div className="between"><span className="eyebrow">LUMIÈRE / {mode}</span><button type="button" onClick={close} aria-label="Close overlay">Close ×</button></div>{mode==='search'?<form onSubmit={submit}><label>Search the collection<input name="q" type="search" maxLength={100} placeholder="Search pieces" autoFocus/></label><button className="primary">Explore results</button></form>:<nav aria-label="Mobile navigation">{[['/shop','Shop all'],['/shop?featured=true','The edit'],...(admin?[['/admin','Admin console']]:[['/wishlist','Wishlist'],['/cart','Bag'],['/orders','Orders'],['/account','Account']])].map(([to,label])=><Link key={to} to={to} onClick={close}>{label}</Link>)}</nav>}</dialog></header>;
}
