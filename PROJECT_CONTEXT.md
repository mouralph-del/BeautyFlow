# PROJECT_CONTEXT.md

# BeautyFlow

## Versão

Projeto em desenvolvimento.

Última atualização:
Julho de 2026.

---

# Objetivo

BeautyFlow é um sistema completo de agendamento online desenvolvido para o estúdio **Thaís Santos | Beauty Studio**.

O sistema tem como objetivo oferecer uma experiência moderna, elegante e intuitiva para clientes, além de facilitar toda a gestão do negócio da profissional.

Este projeto também faz parte do meu portfólio como desenvolvedor Front-end.

---

# Público-alvo

Mulheres interessadas em procedimentos de beleza, principalmente:

- Design de sobrancelhas
- Design com henna
- Brow Lamination
- Microblading
- Extensão de cílios
- Manutenção de cílios
- Epilação facial
- Epilação de buço

---

# Tecnologias

Frontend

- React
- Vite
- JavaScript
- CSS

Ferramentas

- VS Code
- Git
- GitHub

Hospedagem

- Vercel

Banco de dados (futuro)

- Supabase

Integrações futuras

- Pix
- E-mail
- Google Maps
- Instagram

---

# Objetivos do Sistema

O sistema deverá permitir:

✔ Agendamento online

✔ Pagamento da taxa de reserva

✔ Organização da agenda

✔ Painel administrativo

✔ Cadastro de serviços

✔ Estatísticas

✔ Promoções

✔ Controle financeiro

✔ Melhor experiência para clientes

---

# Identidade Visual

Fonte

Poppins

Cores

Fundo

#FAF7F2

Header

#F3E9DE

Cor principal

#B68C6A

Texto principal

#2F2926

Texto secundário

#6B625D

Bordas

#E8DED3

O estilo visual deve transmitir:

- elegância
- leveza
- sofisticação
- confiança
- aparência premium

Nunca utilizar elementos exagerados.

---

# Estrutura do Site

Home

Serviços

Galeria

Agendamento

Contato

Painel Administrativo

---

# Estrutura da Home

A Home deve possuir:

Hero

Apresentação

Serviços em destaque

Galeria

Instagram

Mapa

Rodapé

---

# Serviços em Destaque

Na Home aparecem apenas:

- Design Personalizado

- Extensão de Cílios

- Microblading

Os demais aparecerão apenas na página de Serviços.

---

# Serviços

## Design Personalizado

Valor

R$30

Duração

40 minutos

Taxa de reserva

R$10

Categoria

Sobrancelhas

---

## Design com Henna

Valor

R$45

Duração

50 minutos

Taxa

R$15

Categoria

Sobrancelhas

---

## Brow Lamination

Sem tintura

R$80

1 hora

Taxa

R$30

---

Com tintura

R$100

1h20

Taxa

R$35

---

## Microblading

Valor

R$280

Duração

1h40

Taxa

R$50

Categoria

Micropigmentação

---

## Extensão de Cílios

Valor

R$125

Duração

3 horas

Taxa

R$30

Categoria

Cílios

---

## Manutenção de Cílios

Valor

R$90

Duração

2 horas

Taxa

R$30

---

## Epilação Facial

Valor

R$55

Duração

40 minutos

Taxa

R$20

---

## Epilação de Buço

Valor

R$20

Duração

10 minutos

Taxa

R$10

---

# Funcionamento

Segunda

08h às 18h

Intervalo

12h às 13h30

Terça

08h às 18h

Quarta

08h às 18h

Quinta

Fechado

Sexta

08h às 18h

Sábado

08h às 15h

Domingo

Fechado

---

# Fluxo do Agendamento

Cliente escolhe:

Serviço

↓

Visualiza

Descrição

Valor

Tempo

↓

Seleciona

Data

↓

Seleciona

Horário

↓

Escolhe forma de pagamento

↓

Visualiza resumo

↓

Efetua pagamento da taxa

↓

Agendamento confirmado

---

# Pagamentos

Aceitos

Pix

Dinheiro

Débito

Crédito

Observações

A taxa da maquininha é aplicada apenas para pagamento em crédito.

A taxa de reserva é paga via Pix.

O restante poderá ser pago presencialmente.

---

# Regras

A vaga somente é reservada após o pagamento da taxa.

Caso a taxa não seja paga dentro do prazo definido, o horário volta automaticamente para a agenda.

As regras completas de cancelamento e reagendamento ainda serão implementadas.

---

# Área Administrativa

A administradora poderá:

Cadastrar serviços

Editar serviços

Criar promoções

Abrir agenda

Fechar datas

Visualizar estatísticas

Visualizar agendamentos

Controlar finanças

---

# Componentes React

Header

Hero

Container

SectionTitle

Services

ServiceCard

Button

Posteriormente

Gallery

Testimonials

Footer

Contact

Booking

Admin

---

# Estrutura do Projeto

src

assets

components

data

pages

services

hooks (futuro)

context (futuro)

---

# Funcionalidades Concluídas

✔ Estrutura React

✔ Organização dos componentes

✔ Hero

✔ Cards de serviços

✔ Categorias

✔ Badge "Mais Procurado"

✔ Fotos reais

✔ Layout inicial da Home

✔ Dados centralizados em services.js

---

# Funcionalidades Pendentes

Página Serviços

Página Galeria

Página Agendamento

Página Contato

Responsividade

Menu Mobile

Modal de serviço

Integração com Supabase

Login administrador

Painel Administrativo

Calendário

Reserva via Pix

E-mails automáticos

Deploy

---

# Padrão de Desenvolvimento

Sempre utilizar componentes reutilizáveis.

Evitar repetição de código.

Priorizar organização.

Nomear componentes em PascalCase.

CSS separado por componente.

Código limpo e comentado apenas quando necessário.

---

# Objetivo Final

Criar um sistema profissional de agendamento para o estúdio Thaís Santos Beauty Studio, utilizando React e boas práticas de desenvolvimento, servindo também como projeto de portfólio para demonstrar conhecimentos em Front-end, organização de código, experiência do usuário e integração com serviços externos.

---

# Instruções para Assistentes de IA

Antes de sugerir qualquer alteração:

- Leia este documento por completo.
- Preserve a identidade visual definida.
- Não altere regras de negócio sem confirmar.
- Priorize componentes reutilizáveis.
- Explique alterações passo a passo.
- Evite mudanças grandes de uma vez.
- Sempre considere este documento como a principal referência do projeto.