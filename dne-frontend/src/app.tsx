// src/App.tsx
import { Router, Route } from 'wouter';
import Portfolio from './pages/Portfolio';
import Wallet from './pages/Wallet.tsx';
import Pools from './pages/Pools';
import Liquidity from "./pages/Liquidity.tsx";
import Swap from "./pages/SwapScreen.tsx";
import {BottomNavbar} from "./components/bottomButtonBar/BottomActionBar.tsx";

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



export {App};