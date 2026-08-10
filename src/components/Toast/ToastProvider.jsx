/* eslint-disable react/only-export-components */
import {createContext, useContext, useState, useCallback} from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function ToastProvider({children}){
  const [toasts,setToasts]=useState([]);
  const showToast = useCallback((opts)=>{
    const id = String(Date.now()) + Math.random().toString(36).slice(2,7);
    const toast = {id, title: opts.title||'', message: opts.message||'', type: opts.type||'info', duration: opts.duration||4000};
    setToasts((t)=>[toast,...t]);
    if(toast.duration>0){
      setTimeout(()=>{setToasts((t)=>t.filter(x=>x.id!==id))},toast.duration);
    }
    return id;
  },[]);
  const remove = useCallback((id)=>setToasts((t)=>t.filter(x=>x.id!==id)),[]);
  return (
    <ToastContext.Provider value={{showToast,remove}}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t=> (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <div>
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <div style={{marginLeft:'auto'}}><button onClick={()=>remove(t.id)} aria-label="Fechar">✕</button></div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext(){
  return useContext(ToastContext);
}
