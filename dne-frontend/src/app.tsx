// src/App.tsx
import { Router, Link, Route } from 'wouter';
import Portfolio from './pages/Portfolio';
import Wallet from './pages/Wallet.tsx';
import Pools from './pages/Pools';
import Liquidity from "./pages/Liquidity.tsx";
import Swap from "./pages/SwapScreen.tsx";

const App = () => (
    <div>
        <Router>
            <Route path="/" component={Portfolio} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/pools" component={Pools} />
            <Route path="/liquidity" component={Liquidity} />
            <Route path="/swap" component={Swap} />
        </Router>
        <BottomNavbar />
    </div>
);

const BottomNavbar = () => (
    <div className="navbar">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/settings">Settings</Link>
    </div>
);

export default App;