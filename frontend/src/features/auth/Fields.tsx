import {useId,useState,type InputHTMLAttributes} from 'react';
type Props=InputHTMLAttributes<HTMLInputElement>&{label:string;issue?:string;toggle?:boolean;hint?:string};
export function Field({label,issue,toggle=false,hint,type='text',id,...props}:Props){
 const generated=useId(),fieldId=id??generated,[visible,setVisible]=useState(false);
 return <div className="auth-field-group"><div className={'floating-field'+(toggle?' has-toggle':'')+(issue?' invalid':'')}><input {...props} id={fieldId} type={toggle?(visible?'text':'password'):type} placeholder=" " aria-invalid={!!issue} aria-describedby={[issue?fieldId+'-error':'',hint?fieldId+'-hint':''].filter(Boolean).join(' ')||undefined}/><label htmlFor={fieldId}>{label}</label>{toggle&&<button className="password-toggle" type="button" onClick={()=>setVisible(v=>!v)} aria-pressed={visible} aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()}>{visible?'Hide':'Show'}</button>}</div>{hint&&<p id={fieldId+'-hint'} className="hint">{hint}</p>}{issue&&<p id={fieldId+'-error'} className="field-error">{issue}</p>}</div>;
}
export function PasswordFeedback({value}:{value:string}){
 const score=value.length===0?0:value.length<12?1:value.length<16?2:3;
 const message=score===0?'Use at least 12 characters.':score===1?'Too short — use at least 12 characters.':score===2?'Minimum length met. A longer unique passphrase is preferable.':'Long passphrase. Avoid reused or predictable passwords.';
 return <div className="password-feedback"><div className="strength-track" aria-hidden="true">{[1,2,3].map(x=><span key={x} className={score>=x?'filled':''}/>)}</div><p className="hint" aria-live="polite">{message}</p></div>;
}
