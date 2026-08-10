const services = [
  {
    id: 1,
    slug: "design-personalizado",
    title: "Design Personalizado",
    duration: "40 minutos",
    durationMinutes: 40,
    price: "R$ 30,00",
    priceValue: 30,
    reservationFee: "R$ 10,00",
    reservationFeeValue: 10,
    remainingValue: "R$ 20,00",
    featured: true,
    active: true,
    category: "Sobrancelhas",
    description:
      "Design realizado de acordo com o formato do rosto para valorizar a expressão natural.",

    howItWorks: [
      {
        title: "Análise do formato do rosto",
        description:
          "A profissional observa seus traços, o formato do rosto e o desenho natural das sobrancelhas.",
      },
      {
        title: "Definição do design",
        description:
          "O formato é planejado de maneira personalizada para valorizar sua expressão.",
      },
      {
        title: "Finalização cuidadosa",
        description:
          "Os fios são alinhados e removidos com atenção para proporcionar um resultado natural.",
      },
    ],

    benefits: [
      {
        title: "✨ Resultado natural",
        description:
          "Valoriza o formato original das sobrancelhas sem deixar o resultado artificial.",
      },
      {
        title: "🤎 Design personalizado",
        description:
          "O desenho é adaptado aos traços, ao formato do rosto e às preferências da cliente.",
      },
      {
        title: "🌿 Aparência mais harmoniosa",
        description:
          "Sobrancelhas bem definidas ajudam a equilibrar a expressão e destacar o olhar.",
      },
    ],

    beforeCare: [
      "Chegue ao horário agendado.",
      "Evite utilizar maquiagem na região antes do atendimento.",
      "Informe caso tenha alguma alergia ou sensibilidade.",
    ],

    afterCare: [
      "Evite esfregar a região nas primeiras horas.",
      "Não utilize produtos irritantes no mesmo dia.",
      "Siga todas as orientações passadas pela profissional.",
    ],

    faq: [
      {
        question: "O procedimento fica artificial?",
        answer:
          "Não. O design é feito respeitando o formato natural das sobrancelhas e os traços do rosto.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "O atendimento tem duração aproximada de 40 minutos.",
      },
      {
        question: "É necessário pagar uma taxa de reserva?",
        answer:
          "Sim. A taxa de reserva é de R$ 10,00 e será abatida do valor total do procedimento.",
      },
    ],
  },

  {
    id: 2,
    slug: "design-com-henna",
    title: "Design com Henna",
    duration: "50 minutos",
    durationMinutes: 50,
    price: "R$ 45,00",
    priceValue: 45,
    reservationFee: "R$ 15,00",
    reservationFeeValue: 15,
    remainingValue: "R$ 30,00",
    featured: false,
    active: true,
    category: "Sobrancelhas",
    description:
      "Design de sobrancelhas com aplicação de henna para realçar o formato e preencher visualmente pequenas falhas.",
    howItWorks: [
      {
        title: "Análise e desenho",
        description:
          "A profissional avalia os traços do rosto e define o formato ideal para as sobrancelhas.",
      },
      {
        title: "Aplicação da henna",
        description:
          "A tonalidade é escolhida e aplicada de forma cuidadosa para preencher visualmente pequenas falhas.",
      },
      {
        title: "Acabamento",
        description:
          "O excesso é removido e o desenho é finalizado para criar um resultado harmonioso.",
      },
    ],
    benefits: [
      {
        title: "🌿 Preenchimento temporário",
        description:
          "A henna ajuda a disfarçar pequenas falhas e destacar o desenho das sobrancelhas.",
      },
      {
        title: "✨ Mais definição",
        description:
          "Proporciona um contorno mais marcado sem recorrer a um procedimento permanente.",
      },
      {
        title: "🤎 Resultado personalizado",
        description:
          "O formato e a tonalidade são adaptados aos traços e preferências de cada cliente.",
      },
    ],
    beforeCare: [
      "Chegue ao horário agendado.",
      "Evite utilizar maquiagem na região antes do atendimento.",
      "Informe caso tenha alguma alergia ou sensibilidade a cosméticos.",
    ],

    afterCare: [
      "Evite molhar ou esfregar a região nas primeiras horas.",
      "Não utilize produtos oleosos sobre as sobrancelhas no mesmo dia.",
      "Siga as orientações passadas pela profissional para preservar o resultado.",
    ],
    faq: [
      {
        question: "Quanto tempo a henna permanece?",
        answer:
          "A duração varia conforme o tipo de pele e os cuidados, geralmente permanecendo por alguns dias.",
      },
      {
        question: "Como a tonalidade é escolhida?",
        answer:
          "A profissional considera a cor dos fios, o tom de pele e a preferência da cliente.",
      },
      {
        question: "A taxa de reserva é abatida do valor final?",
        answer:
          "Sim. A taxa de R$ 15,00 será descontada do valor total do procedimento.",
      },
    ],
  },

  {
    id: 3,
    slug: "brow-lamination-sem-tintura",
    title: "Brow Lamination sem Tintura",
    duration: "1 hora",
    durationMinutes: 60,
    price: "R$ 80,00",
    priceValue: 80,
    reservationFee: "R$ 30,00",
    reservationFeeValue: 30,
    remainingValue: "R$ 50,00",
    featured: false,
    active: true,
    category: "Sobrancelhas",
    description:
      "Procedimento que organiza e alinha os fios das sobrancelhas, proporcionando uma aparência mais definida.",
    howItWorks: [
      {
        title: "Análise das sobrancelhas",
        description:
          "A profissional avalia o formato, o crescimento e a direção natural dos fios.",
      },
      {
        title: "Alinhamento dos fios",
        description:
          "Os fios são preparados e alinhados para criar um efeito mais organizado e definido.",
      },
      {
        title: "Finalização",
        description:
          "As sobrancelhas são modeladas e finalizadas para manter um resultado natural.",
      },
    ],

    benefits: [
      {
        title: "✨ Fios mais alinhados",
        description:
          "Ajuda a organizar os fios e proporcionar uma aparência mais definida.",
      },
      {
        title: "🤎 Resultado natural",
        description:
          "Valoriza o formato das sobrancelhas sem utilizar tintura.",
      },
      {
        title: "🌿 Aparência mais preenchida",
        description:
          "O alinhamento dos fios pode criar uma sensação visual de maior volume.",
      },
    ],

    beforeCare: [
      "Chegue ao horário agendado.",
      "Evite utilizar maquiagem ou produtos oleosos na região.",
      "Informe caso tenha sensibilidade, alergia ou irritação na pele.",
    ],

    afterCare: [
      "Evite molhar as sobrancelhas nas primeiras 24 horas.",
      "Não esfregue nem aplique produtos oleosos na região.",
      "Penteie os fios delicadamente conforme a orientação da profissional.",
    ],

    faq: [
      {
        question: "O procedimento utiliza tintura?",
        answer:
          "Não. Esta versão do Brow Lamination realiza apenas o alinhamento e a organização dos fios.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "O atendimento tem duração aproximada de 1 hora.",
      },
      {
        question: "A taxa de reserva é abatida do valor final?",
        answer:
          "Sim. A taxa de reserva de R$ 30,00 será descontada do valor total do procedimento.",
      },
    ],
  },

  {
    id: 4,
    slug: "brow-lamination-com-tintura",
    title: "Brow Lamination com Tintura",
    duration: "1h20",
    durationMinutes: 80,
    price: "R$ 100,00",
    priceValue: 100,
    reservationFee: "R$ 35,00",
    reservationFeeValue: 35,
    remainingValue: "R$ 65,00",
    featured: false,
    active: true,
    category: "Sobrancelhas",
    description:
      "Alinhamento dos fios das sobrancelhas combinado com tintura para intensificar a definição do resultado.",
    howItWorks: [
      {
        title: "Avaliação dos fios",
        description:
          "A profissional analisa o crescimento, a direção e a tonalidade natural das sobrancelhas.",
      },
      {
        title: "Laminação e alinhamento",
        description:
          "Os fios são preparados e direcionados para criar um efeito organizado e mais volumoso.",
      },
      {
        title: "Aplicação da tintura",
        description:
          "A coloração é aplicada e o formato é finalizado para intensificar a definição.",
      },
    ],
    benefits: [
      {
        title: "✨ Fios alinhados",
        description:
          "Organiza os fios e ajuda a manter uma aparência definida por mais tempo.",
      },
      {
        title: "🤎 Cor mais intensa",
        description:
          "A tintura realça os fios claros e reforça visualmente o desenho das sobrancelhas.",
      },
      {
        title: "🌿 Sensação de volume",
        description:
          "O alinhamento combinado à tintura proporciona uma aparência mais preenchida.",
      },
    ],
    beforeCare: [
      "Chegue ao horário agendado.",
      "Evite utilizar maquiagem ou produtos oleosos na região.",
      "Informe caso tenha alergia ou sensibilidade a tinturas e cosméticos.",
    ],

    afterCare: [
      "Evite molhar as sobrancelhas nas primeiras 24 horas.",
      "Não utilize produtos esfoliantes ou oleosos na região.",
      "Siga as orientações da profissional para manter a cor e o alinhamento.",
    ],
    faq: [
      {
        question: "Qual é a diferença da versão sem tintura?",
        answer:
          "Esta versão combina o alinhamento dos fios com coloração para aumentar a definição.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "O atendimento tem duração aproximada de 1 hora e 20 minutos.",
      },
      {
        question: "A taxa de reserva é abatida do valor final?",
        answer:
          "Sim. A taxa de R$ 35,00 será descontada do valor total do procedimento.",
      },
    ],
  },

  {
    id: 5,
    slug: "microblading",
    title: "Microblading",
    duration: "1h40",
    durationMinutes: 100,
    price: "R$ 280,00",
    priceValue: 280,
    reservationFee: "R$ 50,00",
    reservationFeeValue: 50,
    remainingValue: "R$ 230,00",
    featured: true,
    active: true,
    category: "Micropigmentação",
    description:
      "Procedimento semipermanente que proporciona sobrancelhas naturais e bem definidas.",
    howItWorks: [
      {
        title: "Avaliação e planejamento",
        description:
          "O formato, a simetria e a tonalidade são definidos de acordo com os traços da cliente.",
      },
      {
        title: "Desenho fio a fio",
        description:
          "Fios delicados são desenhados para preencher falhas e acompanhar o crescimento natural.",
      },
      {
        title: "Pigmentação e orientação",
        description:
          "O pigmento é aplicado e a cliente recebe todas as instruções para a cicatrização.",
      },
    ],
    benefits: [
      {
        title: "💎 Efeito semipermanente",
        description:
          "Mantém as sobrancelhas definidas por um período prolongado, com evolução gradual.",
      },
      {
        title: "✨ Aparência natural",
        description:
          "A técnica fio a fio busca reproduzir o aspecto dos pelos naturais.",
      },
      {
        title: "🤎 Correção de falhas",
        description:
          "Ajuda a equilibrar o desenho e preencher regiões com menor quantidade de fios.",
      },
    ],
    beforeCare: [
      "Evite utilizar maquiagem na região antes do atendimento.",
      "Informe sobre alergias, sensibilidades ou tratamentos realizados na pele.",
      "Evite procedimentos agressivos na região nos dias anteriores.",
    ],

    afterCare: [
      "Evite tocar, esfregar ou molhar excessivamente a região.",
      "Não utilize maquiagem ou produtos não recomendados durante a recuperação.",
      "Siga rigorosamente todas as orientações fornecidas pela profissional.",
    ],
    faq: [
      {
        question: "O resultado é definitivo?",
        answer:
          "Não. A microblading é semipermanente e pode clarear gradualmente com o tempo.",
      },
      {
        question: "É necessário retoque?",
        answer:
          "A necessidade de retoque será avaliada pela profissional após o período de cicatrização.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "O atendimento tem duração aproximada de 1 hora e 40 minutos.",
      },
    ],
  },

  {
    id: 6,
    slug: "extensao-de-cilios",
    title: "Extensão de Cílios",
    duration: "3 horas",
    durationMinutes: 180,
    price: "R$ 125,00",
    priceValue: 125,
    reservationFee: "R$ 30,00",
    reservationFeeValue: 30,
    remainingValue: "R$ 95,00",
    featured: true,
    active: true,
    category: "Cílios",
    description:
      "Alongamento dos fios para proporcionar um olhar marcante, elegante e natural.",
    howItWorks: [
      {
        title: "Avaliação do olhar",
        description:
          "A profissional analisa os cílios naturais e conversa sobre o efeito desejado.",
      },
      {
        title: "Escolha do mapeamento",
        description:
          "Curvatura, comprimento e distribuição são definidos para harmonizar com os olhos.",
      },
      {
        title: "Aplicação dos fios",
        description:
          "As extensões são aplicadas cuidadosamente para criar um resultado confortável e elegante.",
      },
    ],
    benefits: [
      {
        title: "👁️ Olhar destacado",
        description:
          "Realça os olhos e proporciona mais presença ao olhar no dia a dia.",
      },
      {
        title: "✨ Efeito personalizado",
        description:
          "O mapeamento é adaptado ao formato dos olhos e à preferência da cliente.",
      },
      {
        title: "🤎 Mais praticidade",
        description:
          "Reduz a necessidade de máscara de cílios e facilita a rotina de beleza.",
      },
    ],
    beforeCare: [
      "Chegue sem maquiagem nos olhos.",
      "Evite utilizar máscara de cílios ou produtos oleosos antes do atendimento.",
      "Informe caso tenha alergia ou sensibilidade na região dos olhos.",
    ],

    afterCare: [
      "Evite molhar ou esfregar os cílios nas primeiras horas.",
      "Não utilize produtos oleosos próximos aos olhos.",
      "Penteie os cílios delicadamente e siga as orientações da profissional.",
    ],
    faq: [
      {
        question: "A extensão danifica os cílios naturais?",
        answer:
          "Quando aplicada corretamente e cuidada conforme as orientações, a técnica respeita os fios naturais.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "A aplicação inicial tem duração aproximada de 3 horas.",
      },
      {
        question: "Quando devo fazer a manutenção?",
        answer:
          "O intervalo depende do ciclo dos fios e dos cuidados; a profissional indicará o momento adequado.",
      },
    ],
  },

  {
    id: 7,
    slug: "manutencao-de-cilios",
    title: "Manutenção de Cílios",
    duration: "2 horas",
    durationMinutes: 120,
    price: "R$ 90,00",
    priceValue: 90,
    reservationFee: "R$ 30,00",
    reservationFeeValue: 30,
    remainingValue: "R$ 60,00",
    featured: false,
    active: true,
    category: "Cílios",
    description:
      "Manutenção dos fios da extensão para repor perdas e preservar o resultado do procedimento.",
    howItWorks: [
      {
        title: "Avaliação da extensão",
        description:
          "A profissional verifica a retenção, o crescimento dos fios e as áreas que precisam de reposição.",
      },
      {
        title: "Higienização e remoção",
        description:
          "Os cílios são higienizados e extensões crescidas ou desalinhadas são removidas com cuidado.",
      },
      {
        title: "Reposição dos fios",
        description:
          "Novas extensões são aplicadas para recuperar a uniformidade e o efeito do procedimento.",
      },
    ],
    benefits: [
      {
        title: "🔄 Resultado renovado",
        description:
          "Repõe as perdas naturais e devolve uniformidade ao conjunto dos cílios.",
      },
      {
        title: "✨ Maior durabilidade",
        description:
          "A manutenção periódica ajuda a preservar o efeito da extensão por mais tempo.",
      },
      {
        title: "🤎 Acabamento cuidadoso",
        description:
          "Fios crescidos são avaliados para manter conforto e aparência organizada.",
      },
    ],
    beforeCare: [
      "Chegue sem maquiagem nos olhos.",
      "Evite utilizar produtos oleosos antes do atendimento.",
      "Não retire ou puxe os fios da extensão em casa.",
    ],

    afterCare: [
      "Evite molhar ou esfregar os cílios nas primeiras horas.",
      "Não utilize produtos oleosos próximos aos olhos.",
      "Penteie os fios delicadamente para manter o alinhamento.",
    ],
    faq: [
      {
        question: "Quando a manutenção pode ser realizada?",
        answer:
          "A profissional avaliará a quantidade e o estado das extensões restantes antes do procedimento.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "A manutenção tem duração aproximada de 2 horas.",
      },
      {
        question: "Posso mudar o efeito na manutenção?",
        answer:
          "Pequenos ajustes podem ser avaliados, mas mudanças maiores podem exigir uma nova aplicação.",
      },
    ],
  },

  {
    id: 8,
    slug: "epilacao-facial",
    title: "Epilação Facial",
    duration: "40 minutos",
    durationMinutes: 40,
    price: "R$ 55,00",
    priceValue: 55,
    reservationFee: "R$ 20,00",
    reservationFeeValue: 20,
    remainingValue: "R$ 35,00",
    featured: false,
    active: true,
    category: "Cuidados Faciais",
    description:
      "Remoção cuidadosa dos pelos faciais para proporcionar uma aparência mais uniforme.",
    howItWorks: [
      {
        title: "Avaliação da pele",
        description:
          "A profissional observa a sensibilidade da pele e identifica as regiões que serão tratadas.",
      },
      {
        title: "Preparação da região",
        description:
          "A pele é preparada cuidadosamente para tornar o procedimento mais confortável.",
      },
      {
        title: "Epilação e finalização",
        description:
          "Os pelos são removidos e a pele recebe os cuidados finais adequados.",
      },
    ],
    benefits: [
      {
        title: "🌸 Pele mais uniforme",
        description:
          "A remoção dos pelos ajuda a deixar a aparência do rosto mais uniforme.",
      },
      {
        title: "✨ Toque suave",
        description:
          "Proporciona sensação de pele lisa e bem cuidada após o procedimento.",
      },
      {
        title: "🤎 Cuidado completo",
        description:
          "Permite tratar diferentes regiões do rosto em um único atendimento.",
      },
    ],
    beforeCare: [
      "Chegue com a pele limpa e sem maquiagem.",
      "Evite utilizar produtos esfoliantes antes do atendimento.",
      "Informe caso esteja com irritação, sensibilidade ou lesões na pele.",
    ],

    afterCare: [
      "Evite exposição direta ao sol logo após o procedimento.",
      "Não utilize produtos agressivos ou esfoliantes no mesmo dia.",
      "Evite esfregar a pele e siga as orientações da profissional.",
    ],
    faq: [
      {
        question: "Quais regiões do rosto são atendidas?",
        answer:
          "As regiões serão definidas durante a avaliação, conforme a necessidade da cliente.",
      },
      {
        question: "A pele pode ficar avermelhada?",
        answer:
          "Uma vermelhidão temporária pode ocorrer e tende a diminuir com os cuidados recomendados.",
      },
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "O atendimento tem duração aproximada de 40 minutos.",
      },
    ],
  },

  {
    id: 9,
    slug: "epilacao-no-buco",
    title: "Epilação no Buço",
    duration: "10 minutos",
    durationMinutes: 10,
    price: "R$ 20,00",
    priceValue: 20,
    reservationFee: "R$ 10,00",
    reservationFeeValue: 10,
    remainingValue: "R$ 10,00",
    featured: false,
    active: true,
    category: "Cuidados Faciais",
    description:
      "Remoção dos pelos da região do buço realizada de maneira cuidadosa.",
    howItWorks: [
      {
        title: "Avaliação da região",
        description:
          "A profissional verifica a sensibilidade da pele e prepara a área do buço.",
      },
      {
        title: "Remoção dos pelos",
        description:
          "Os pelos são removidos com técnica cuidadosa e atenção ao conforto.",
      },
      {
        title: "Finalização da pele",
        description:
          "A região recebe cuidados finais para ajudar a acalmar e proteger a pele.",
      },
    ],
    benefits: [
      {
        title: "💋 Região mais uniforme",
        description:
          "A remoção dos pelos deixa a aparência do buço mais uniforme.",
      },
      {
        title: "✨ Procedimento rápido",
        description:
          "O atendimento é prático e pode ser incluído facilmente na rotina de cuidados.",
      },
      {
        title: "🌿 Finalização cuidadosa",
        description:
          "A pele recebe atenção antes e depois da remoção dos pelos.",
      },
    ],
    beforeCare: [
      "Chegue com a região limpa e sem maquiagem.",
      "Evite utilizar produtos esfoliantes antes do atendimento.",
      "Informe caso esteja com irritação ou sensibilidade na região.",
    ],

    afterCare: [
      "Evite exposição direta ao sol logo após o procedimento.",
      "Não utilize produtos agressivos ou esfoliantes no mesmo dia.",
      "Evite tocar ou esfregar a região nas primeiras horas.",
    ],
    faq: [
      {
        question: "Quanto tempo dura o atendimento?",
        answer: "O atendimento tem duração aproximada de 10 minutos.",
      },
      {
        question: "A região pode ficar sensível?",
        answer:
          "Pode ocorrer sensibilidade ou vermelhidão temporária, que tende a diminuir rapidamente.",
      },
      {
        question: "A taxa de reserva é abatida do valor final?",
        answer:
          "Sim. A taxa de R$ 10,00 será descontada do valor total do procedimento.",
      },
    ],
  },
];

export default services;
