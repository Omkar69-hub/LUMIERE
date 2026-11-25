export type User={id:string;name:string;email:string;mobile:string;role:'CUSTOMER'|'ADMIN';emailVerifiedAt:string|null};
export class ApiError extends Error{constructor(public status:number,message:string,public fields:{field:string;message:string}[]=[] ){super(message);}}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const res=await fetch('/api'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(res.status===204)return undefined as T;
  const data=await res.json();
  if(!res.ok)throw new ApiError(res.status,data.error||'Request failed.',Array.isArray(data.fields)?data.fields:[]);
  return data as T;
}
