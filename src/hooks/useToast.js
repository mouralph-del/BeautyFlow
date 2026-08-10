import { useToastContext } from "../components/Toast/ToastProvider";

export default function useToast(){
  const ctx = useToastContext();
  if(!ctx) return { showToast: ()=>{} };
  return { showToast: ctx.showToast, removeToast: ctx.remove };
}
