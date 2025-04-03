import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {App} from './app.tsx'
import { Buffer } from 'buffer';

window.global = window;
window.Buffer = window.Buffer || Buffer;


createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
