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
            <Route path="/portfolio" component={Portfolio} />
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
        <Link to="/portfolio">Portfolio</Link>
        <Link to="/wallet">Wallet</Link>
        <Link to="/pools">Settings</Link>
        <Link to="/liquidity">Liquidity</Link>
        <Link to="/swap">Swap</Link>
    </div>
);

export {App};