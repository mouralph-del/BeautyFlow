export default function mapError(err){
  if(!err) return {title:'Ocorreu um problema', message:'Tente novamente mais tarde.'};
  // Se vier como string
  if(typeof err === 'string') return {title:'Ocorreu um problema', message: err};
  // Supabase-like error
  if(err?.message && err?.code) return {title:'Não foi possível concluir a operação', message: 'Não foi possível concluir esta operação. Tente novamente.'};
  // Generic Error object
  if(err?.message) {
    // avoid exposing raw message; map some common tokens
    const msg = String(err.message).toLowerCase();
    if(msg.includes('network') || msg.includes('fetch')) return {title:'Problema de conexão', message:'Verifique sua internet e tente novamente.'};
    return {title:'Ocorreu um problema', message:'Ocorreu um erro inesperado. Tente novamente.'};
  }
  return {title:'Ocorreu um problema', message:'Tente novamente mais tarde.'};
}

export function formatErrorMessage(err){
  return mapError(err).message;
}
