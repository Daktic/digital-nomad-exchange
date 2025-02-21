import {Link} from "wouter";

const BottomNavbar = () => (
    <div className="navbar">
    <Link to="/portfolio">Portfolio</Link>
        <Link to="/wallet">Wallet</Link>
    <Link to="/pools">Settings</Link>
    <Link to="/liquidity">Liquidity</Link>
    <Link to="/swap">Swap</Link>
    </div>
);

export {BottomNavbar};