import { createRoot } from 'react-dom/client';
import { BrowserRouter,Routes,Route,Link } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { AuthPage } from './features/auth/AuthPage';
import { RecoveryPage } from './features/auth/RecoveryPage';
import { Account } from './pages/Account';
import { Shopping } from './pages/Shopping';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import './styles/global.css';
import './styles/catalog.css';
const query=new QueryClient({defaultOptions:{queries:{staleTime:0,retry:false}}});
function Home(){return <main className="home"><header className="between"><Link className="wordmark" to="/">LUMIÈRE</Link><nav><Link to="/shop">Shop</Link> <Link to="/login">Sign in</Link> <Link to="/signup">Join</Link></nav></header><section className="hero"><p className="eyebrow">THE FIRST EDIT</p><h1>A quieter kind<br/>of luxury.</h1><p>Considered essentials. An enduring point of view.</p><Link className="primary" to="/shop">Explore the collection</Link></section></main>}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={query}><BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/cart" element={<Shopping key="cart" mode="cart"/>}/><Route path="/wishlist" element={<Shopping key="wishlist" mode="wishlist"/>}/><Route path="/shop" element={<Shop/>}/><Route path="/products/:slug" element={<ProductDetail/>}/><Route path="/login" element={<AuthPage key="login" mode="login"/>}/><Route path="/signup" element={<AuthPage key="register" mode="register"/>}/><Route path="/forgot-password" element={<RecoveryPage key="forgot" mode="forgot-password"/>}/><Route path="/reset-password" element={<RecoveryPage key="reset" mode="reset-password"/>}/><Route path="/verify-email" element={<RecoveryPage key="verify" mode="verify-email"/>}/><Route path="/account" element={<Account/>}/><Route path="/terms" element={<main className="page"><h1>Terms of use — development draft</h1><p>This is a development environment, not a live store. Do not submit real personal information. Final commercial terms require owner approval before release.</p><Link to="/signup">Back</Link></main>}/><Route path="*" element={<main className="page"><h1>Page not found</h1><Link to="/">Home</Link></main>}/></Routes></BrowserRouter></QueryClientProvider>);
