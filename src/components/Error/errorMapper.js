const safeOperationMessages = new Set([
  "Entre na sua conta para solicitar um encaixe",
  "Escolha uma data futura",
  "Selecione ao menos um serviço",
  "Escolha um período de preferência",
  "A agenda desta data não está liberada",
  "Você já possui uma solicitação de encaixe para esta data e serviço",
]);

export default function mapError(err){
  if(!err) return {title:'Ocorreu um problema', message:'Tente novamente mais tarde.'};
  // Se vier como string
  if(typeof err === 'string') return {title:'Ocorreu um problema', message: err};
  // Supabase-like error
  if(err?.message && err?.code) {
    const safeMessage = String(err.message).trim();
    if(safeOperationMessages.has(safeMessage)) return {title:'Revise a solicitação', message:safeMessage};
    return {title:'Não foi possível concluir a operação', message: 'Não foi possível concluir esta operação. Tente novamente.'};
  }
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
