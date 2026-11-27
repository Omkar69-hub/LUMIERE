export const sessionChangeKey='lumiere:session-changed';
export function notifySessionChange(){try{localStorage.setItem(sessionChangeKey,crypto.randomUUID());}catch{/* Server authorization remains enforced. */}}
