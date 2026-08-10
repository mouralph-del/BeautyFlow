import { BrowserRouter } from "react-router-dom";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./components/Toast/ToastProvider";

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
</StrictMode>
)
