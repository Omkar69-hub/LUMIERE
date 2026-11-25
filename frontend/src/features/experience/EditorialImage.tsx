import {useState} from 'react';
export function EditorialImage({src,alt,priority=false}:{src?:string|null;alt?:string|null;priority?:boolean}){
 const [failed,setFailed]=useState<string|null>(null);
 const usePhoto=!!src&&failed!==src;
 return <div className="editorial-image"><img src={usePhoto?src!:'/images/atelier-study.svg'} alt={usePhoto?(alt??'LUMIÈRE campaign'):'Original abstract textile and architectural light study'} width={1200} height={1500} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} onError={()=>{if(src)setFailed(src);}}/></div>;
}
