import { render } from 'preact'
import { App } from './app.tsx'
import './index.css'
import {WalletProvider} from "./WalletProvider.tsx";

render(
    <WalletProvider>
        <App />
    </WalletProvider>
    , document.getElementById('root')!)
