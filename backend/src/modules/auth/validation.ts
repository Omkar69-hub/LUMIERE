import { z } from 'zod';
export const email=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
export const password=z.string().min(12,'Use at least 12 characters.').max(128);
export const registration=z.object({name:z.string().trim().min(2).max(100),email,mobile:z.string().regex(/^\+?[0-9]{10,15}$/,'Enter a valid mobile number.'),password,confirmPassword:z.string(),terms:z.literal(true)}).strict().refine(v=>v.password===v.confirmPassword,{path:['confirmPassword'],message:'Passwords do not match.'});
export const login=z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(false)}).strict();
export const reset=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),password,confirmPassword:z.string()}).strict().refine(v=>v.password===v.confirmPassword,{path:['confirmPassword'],message:'Passwords do not match.'});
