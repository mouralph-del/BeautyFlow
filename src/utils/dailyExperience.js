const TIME_ZONE = "America/Sao_Paulo";

export const getSaoPauloParts = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" })
    .formatToParts(date).map(({ type, value }) => [type, value])
);

export const getLocalDateKey = (date = new Date()) => { const p=getSaoPauloParts(date); return `${p.year}-${p.month}-${p.day}`; };
export const getGreeting = (date = new Date(), name = "") => { const hour=Number(getSaoPauloParts(date).hour); const greeting=hour>=5&&hour<12?"Bom dia":hour>=12&&hour<18?"Boa tarde":"Boa noite"; return name?.trim()?`${greeting}, ${name.trim()}! 🤎`:"Olá! Que bom ter você por aqui. 🤎"; };
export const getMorningMessage = ({ date=new Date(), appointments=0, pending=0 }={}) => { const day=getSaoPauloParts(date).weekday; if(pending>0)return "Vamos começar pelas prioridades para deixar o dia mais leve e organizado."; if(appointments>=5)return "Hoje será um dia movimentado. Respire, organize cada etapa e cuide também de você."; if(appointments===0)return "Hoje é uma nova oportunidade de fazer alguém se sentir ainda mais especial."; if(day==="Mon")return "Um novo dia começa, com novos momentos para cuidar e transformar."; if(day==="Fri")return "Que esta sexta-feira seja leve, organizada e cheia de bons encontros."; if(day==="Sat")return "Que cada atendimento de hoje seja realizado com carinho e tranquilidade."; return "Que seu dia seja leve, organizado e cheio de bons encontros."; };
export const getClosingMessage = ({ appointments=0, completed=0, pending=0 }={}) => pending>0?"O dia terminou, mas algumas pendências continuam esperando sua atenção.":appointments===0?"Hoje foi um dia mais tranquilo. Que amanhã traga novos momentos especiais.":appointments>=5?"Foi um dia cheio de atendimentos e cuidado. Obrigada por toda a dedicação.":completed===appointments?"Parabéns por mais um dia concluído! Agora é hora de descansar. 🤎":"Obrigada por todo o cuidado dedicado hoje. Amanhã será um novo começo. 🤎";
export const getAdminFirstName = (user) => { const value=user?.user_metadata?.full_name?.trim()||user?.user_metadata?.name?.trim()||""; return value.split(/\s+/)[0]||""; };
