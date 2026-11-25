import {Link,type LinkProps} from 'react-router-dom';
export function MotionLink(props:LinkProps){
 const enabled=typeof document!=='undefined'&&'startViewTransition' in document&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 return <Link {...props} viewTransition={enabled}/>;
}
