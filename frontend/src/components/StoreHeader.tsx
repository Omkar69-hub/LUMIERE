import { Link } from 'react-router-dom';
export function StoreHeader(){return <header className="store-header"><Link className="wordmark" to="/">LUMIÈRE</Link><nav aria-label="Main navigation"><Link to="/shop">Shop</Link><Link to="/wishlist">Wishlist</Link><Link to="/cart">Bag</Link><Link to="/orders">Orders</Link><Link to="/account">Account</Link></nav></header>}
