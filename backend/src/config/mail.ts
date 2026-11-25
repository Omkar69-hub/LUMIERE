import nodemailer from 'nodemailer';
export type Mailer = (email: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD', url: string) => Promise<void>;
export function configuredMailer(): Mailer | undefined {
  const {SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM} = process.env;
  if (!SMTP_HOST || !SMTP_FROM || !SMTP_USER || !SMTP_PASS) return;
  const port = Number(SMTP_PORT || 587);
  const transport = nodemailer.createTransport({host:SMTP_HOST,port,secure:port===465,requireTLS:port!==465,disableFileAccess:true,disableUrlAccess:true,auth:{user:SMTP_USER,pass:SMTP_PASS}});
  return async (to,purpose,url) => {
    await transport.sendMail({from:SMTP_FROM,to,subject:purpose==='VERIFY_EMAIL'?'Verify your LUMIÈRE account':'Reset your LUMIÈRE password',text:'Open this single-use link: '+url+'\nIf you did not request this, ignore this email.'});
  };
}
