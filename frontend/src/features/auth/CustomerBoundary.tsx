import {useEffect,useState,type ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Navigate} from 'react-router-dom';
import {api,ApiError,type User} from '../../services/api';
export function CustomerBoundary({children}:{children:ReactNode}){
 const [checked,setChecked]=useState(false);
 const session=useQuery({queryKey:['session'],queryFn:()=>api<{user:User}>('/users/me'),retry:false,refetchOnMount:'always'});
 useEffect(()=>{if(!session.isFetching&&!session.isPending)setChecked(true);},[session.isFetching,session.isPending]);
 if(!checked||session.isPending)return <main className="page"><p role="status">Checking your account…</p></main>;
 if(session.error instanceof ApiError&&session.error.status===401)return <Navigate to="/login" replace/>;
 if(session.isError||!session.data)return <main className="page"><p role="alert">Unable to verify account.</p><button onClick={()=>void session.refetch()}>Retry</button></main>;
 if(session.data.user.role==='ADMIN')return <Navigate to="/admin" replace/>;
 return <>{children}</>;
}
