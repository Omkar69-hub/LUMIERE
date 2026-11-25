import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
export function AuthLayout({title,children}:{title:string;children:ReactNode}){
 return <main className="split"><aside className="editorial"><div className="editorial-copy"><span>THE ART OF LESS</span><h2>Quiet by nature.<br/>Distinct by design.</h2><p>THE LUMIÈRE EDIT — 01</p></div></aside><section className="form-panel"><Link className="wordmark" to="/">LUMIÈRE</Link><div className="form-inner"><p className="eyebrow">YOUR PRIVATE ATELIER</p><h1>{title}</h1>{children}</div></section></main>;
}
