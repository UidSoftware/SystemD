# Instrucao_Claude_Code_Fase2.md
# Sistema: Uid Software — Sistema Interno
# Fase 2 — Reconstrução completa da Vitrine Pública
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. Confirme que a Fase 1 está concluída (`make test` passando, `/api/leads/` funcionando)
3. Só então escreva código

---

## Contexto rápido

Reconstrução completa da vitrine pública da **Uid Software**.
O site atual tem os componentes base da Fase 1 (Hero, Sobre, Portfolio, Contato), mas com problemas visuais e de copy identificados.
Esta fase entrega um site profissional, com identidade visual definida, copy estratégico e responsivo.

A vitrine serve dois públicos simultâneos:
- **Cliente** (MEI / pequeno empresário) — quer resultado, não feature, linguagem simples
- **Parceiro / investidor** — quer ver solidez, visão, produto real

---

## Escopo da Fase 2

### ✅ O que entra nesta fase

| # | Entrega | Descrição |
|---|---------|-----------|
| 1 | Navbar | Sticky, links âncora, CTA, mobile hamburguer |
| 2 | Hero | Reescrito com headline forte + elemento visual |
| 3 | Pain | Seção nova — identificação com a dor do cliente |
| 4 | HowItWorks | Seção nova — 3 passos do processo Uid |
| 5 | Portfolio | Reescrito — cards com badges + Studio Fluir real |
| 6 | Testimonial | Criado com TODO para depoimento real |
| 7 | About | Reescrito — começa pela proposta de valor, não pela empresa |
| 8 | Contact | Ajustado — manter integração `/api/leads/`, novo copy |
| 9 | Footer | Criado com CNPJ, links e localização |
| 10 | WhatsAppButton | Botão flutuante fixed bottom-right |
| 11 | CSS variables | Paleta oficial Uid implementada |
| 12 | Fontes | Plus Jakarta Sans (display) + DM Sans (body) |
| 13 | SEO | react-helmet com meta tags |
| 14 | App.jsx | Nova ordem de seções |

### ❌ O que NÃO entra nesta fase

- Módulo de gestão interna
- Autenticação / login
- Dashboard
- Animações complexas (parallax, 3D) — apenas fade-in/slide-up no scroll
- Integração WhatsApp real (só link href)
- Screenshot real do Studio Fluir (deixar placeholder com TODO)

---

## Identidade Visual — PALETA OFICIAL UID (imutável)

```css
/* === BRAND COLORS — NUNCA ALTERAR === */
--color-brand-blue:   #063BF8;   /* Azul Royal — CTAs, destaques */
--color-brand-red:    #FF0000;   /* Vermelho — badge produção, urgência */
--color-brand-purple: #3d0361;   /* Roxo escuro — backgrounds */

/* === DERIVADAS === */
--color-bg-dark:      #0a0014;   /* fundo principal */
--color-bg-mid:       #1a0a2e;   /* cards, seções secundárias */
--color-bg-section:   #3d0361;   /* seções de destaque */

/* === TEXTO === */
--color-text-main:    #f1f5f9;
--color-text-muted:   #a78bca;
--color-text-accent:  #6b8fff;

/* === UI === */
--color-border:       rgba(6, 59, 248, 0.2);
--color-border-hover: rgba(6, 59, 248, 0.6);
--color-btn-primary:  #063BF8;
--color-btn-hover:    #0430cc;
--color-badge-prod:   #FF0000;
--color-badge-dev:    #063BF8;
--color-badge-next:   #3d0361;
```

### Gradiente oficial Uid

```css
/* Hero e seções de destaque */
background: linear-gradient(135deg, #0a0014 0%, #3d0361 50%, #063BF8 100%);

/* Cards */
background: linear-gradient(135deg, #1a0a2e 0%, #1a1060 100%);

/* Glow hero */
box-shadow: 0 0 80px rgba(6, 59, 248, 0.3), 0 0 40px rgba(61, 3, 97, 0.4);
```

### Tipografia

```html
<!-- Google Fonts — importar no index.css -->
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
```

- **Display / headlines:** Plus Jakarta Sans (700, 800)
- **Body / textos:** DM Sans (400, 500, 600)
- ❌ Não usar Inter, Roboto ou Arial

---

## Estrutura de componentes

```
frontend/src/
├── components/
│   ├── Navbar.jsx          ← CRIAR
│   ├── Hero.jsx            ← REESCREVER
│   ├── Pain.jsx            ← CRIAR
│   ├── HowItWorks.jsx      ← CRIAR
│   ├── Portfolio.jsx       ← REESCREVER
│   ├── Testimonial.jsx     ← CRIAR (com TODO)
│   ├── About.jsx           ← REESCREVER
│   ├── Contact.jsx         ← AJUSTAR (manter API)
│   ├── Footer.jsx          ← CRIAR
│   └── WhatsAppButton.jsx  ← CRIAR (flutuante)
├── App.jsx                 ← ATUALIZAR ordem das seções
└── index.css               ← ATUALIZAR variáveis CSS + fontes
```

### App.jsx — ordem obrigatória das seções

```jsx
<Navbar />
<Hero />         {/* id="inicio" */}
<Pain />
<HowItWorks />   {/* id="como-funciona" */}
<Portfolio />    {/* id="portfolio" */}
<Testimonial />
<About />
<Contact />      {/* id="contato" */}
<Footer />
<WhatsAppButton />
```

---

## Especificação por componente

### Navbar.jsx
- Logo "uid" lowercase estilizado à esquerda (fonte display, bold)
- Links: Início | Como funciona | Portfólio | Contato (scroll suave)
- Botão CTA: "Quero meu sistema" → ancora `#contato`
- `position: sticky; top: 0; z-index: 50`
- Background: `#0a0014` com `backdrop-filter: blur(10px)` ao rolar
- Mobile: hamburguer menu (useState para toggle)
- Border-bottom sutil ao rolar: `rgba(6, 59, 248, 0.2)`

### Hero.jsx
- Background: gradiente oficial Uid
- Glow effect aplicado
- **Headline:** "Chega de planilha. Chega de papel. Chega de caos."
- **Subtítulo:** "Sistemas de gestão sob medida para estúdios, salões, clínicas e pequenos negócios. Do zero ao ar, sem complicação."
- CTA primário: "Quero meu sistema" (azul, grande) → `#contato`
- CTA secundário: "Ver portfólio" (ghost/outline) → `#portfolio`
- Elemento visual: grid geométrico sutil animado OU mockup de dashboard
- ❌ Não deixar o hero só com texto — precisa de elemento visual

### Pain.jsx
- Background: `#0a0014`
- **Título:** "Você se identifica com algum desses?"
- 4 cards de dor:
  - 📋 "Controlo tudo em papel ou planilha e sempre perco algo"
  - 📱 "Meu WhatsApp virou sistema de gestão e tá um caos"
  - 💸 "Não sei quanto entrou, quanto saiu e o que eu devo receber"
  - ⏰ "Perco tempo com tarefas que um sistema resolveria em segundos"
- Fechar com: "Se você marcou pelo menos um, a gente pode ajudar."
- Cards com `border: 1px solid rgba(255,255,255,0.08)` e hover sutil

### HowItWorks.jsx
- Background: `#1a0a2e`
- **Título:** "Simples assim"
- 3 passos com número destacado em azul:
  1. 🗣️ **Me conta seu negócio** — Você explica como funciona. A gente ouve de verdade, não só anota requisitos.
  2. 🔧 **A gente constrói** — Sistema feito pra sua realidade. Não um template adaptado.
  3. 🚀 **Você usa e cresce** — Acompanhamos o crescimento. Não sumimos depois da entrega.
- Layout: 3 colunas no desktop, empilhado no mobile
- Conectar passos com linha/seta entre eles no desktop

### Portfolio.jsx
- Background: `#0a0014`
- **Título:** "O que já construímos"
- **Card 1 — Studio Fluir:**
  - Badge vermelho: "Em produção"
  - Nome: Studio Fluir
  - Descrição: "Sistema completo de gestão para estúdio de dança e pilates. Controle de alunos, turmas, mensalidades, frequência, créditos e reposições."
  - `{/* TODO: adicionar screenshot real do sistema Studio Fluir */}`
  - Tags pill: Django · React · PostgreSQL · Docker
  - Link externo: nostudiofluir.com.br
- **Card 2 — Gestão de Carteira:**
  - Badge azul: "Em desenvolvimento"
  - Nome: Gestão de Carteira
  - Descrição: "Gestão de clientes, contratos e cobranças recorrentes para prestadores de serviço."
  - Tags pill: Django · React · Docker
- **Card 3 — CTA:**
  - Badge roxo: "Próximo"
  - Nome: Seu sistema aqui
  - Descrição: "Cada nicho tem suas particularidades. A gente aprende o seu negócio antes de propor qualquer solução."
  - Botão: "Vamos conversar" → `#contato`

### Testimonial.jsx
```jsx
{/* TODO: adicionar depoimento real do Studio Fluir
    - Solicitar ao cliente: foto/avatar, nome, cargo, texto do depoimento
    - Estrutura: foto | texto | nome + cargo + empresa
*/}
```
- Renderizar seção preparada visualmente com placeholder até ter depoimento real
- Background: `#1a0a2e`
- **Título:** "Quem já usa, aprova"

### About.jsx
- Background: `#3d0361` (seção de destaque)
- ❌ NÃO começar falando da empresa — começar pela proposta de valor
- **Título:** "Por que a Uid é diferente"
- **Texto:**
  > "Antes de escrever uma linha de código, a gente entende seu negócio por dentro. Viramos clientes, testamos o processo, sentimos a dor.
  >
  > A Uid nasceu em Uberlândia/MG com uma missão simples: colocar tecnologia de verdade nas mãos de quem realmente precisa — o MEI e o pequeno empresário que sustenta o Brasil.
  >
  > Somos pequenos de propósito. Atendemos poucos clientes por nicho justamente pra poder atender bem."
- 3 cards de diferencial:
  - 🔍 **Sob medida de verdade** — Cada sistema é construído pro seu negócio. Não adaptamos template.
  - 🤝 **Parceria, não fornecimento** — Acompanhamos seu crescimento. Você não vira ticket de suporte.
  - 🧠 **Interface pra quem usa** — Pensada pra pessoa que vai usar todo dia, não pra quem programa.

### Contact.jsx
- Background: `#0a0014`
- **Título:** "Pronto pra organizar seu negócio?"
- **Subtítulo:** "Conta seu desafio. A gente avalia juntos se faz sentido desenvolver um sistema pra você. Sem compromisso, sem enrolação."
- Campos do formulário:
  - Nome *
  - E-mail *
  - Telefone / WhatsApp
  - Nome da empresa
  - Descreva o que você precisa *
  - Botão: **"Quero conversar"** (não "Enviar solicitação")
- ✅ Manter integração: `POST /api/leads/`
- Abaixo do formulário: ícone WhatsApp + "Prefere o WhatsApp? Fala direto com a gente" + número

### Footer.jsx
- Background: `#0a0014` com border-top sutil
- Logo Uid à esquerda
- Links rápidos: Como funciona | Portfólio | Contato
- CNPJ: 60.939.393/0001-25
- Uberlândia/MG
- © 2025 Uid Software e Tecnologia LTDA

### WhatsAppButton.jsx
- `position: fixed; bottom: 24px; right: 24px; z-index: 99`
- Ícone WhatsApp verde (#25D366)
- `href="https://wa.me/5534XXXXXXXXX"` (substituir pelo número real)
- Tooltip: "Fala com a gente"
- Animação: pulse sutil
- `{/* TODO: substituir número do WhatsApp */}`

---

## Regras de CSS / Tailwind

- Dark predominante — ❌ não alternar dark/branco/dark entre seções
- Cards: `border: 1px solid rgba(255,255,255,0.08)`
- Hover em cards: `border-color` muda para `rgba(6, 59, 248, 0.4)` + `transform: translateY(-2px)`
- Micro-animações no scroll: fade-in + slide-up (usar Intersection Observer)
- Botão primário: azul sólido `#063BF8` com hover `#0430cc` + `box-shadow`
- Badge pills: `border-radius: 9999px`, padding `4px 12px`, font-size pequeno
- Scroll suave: `html { scroll-behavior: smooth; }`

---

## SEO — react-helmet

```bash
npm install react-helmet-async
```

```jsx
// App.jsx
import { HelmetProvider } from 'react-helmet-async'

// index.html ou componente raiz
<title>Uid Software — Sistemas de gestão para pequenas empresas | Uberlândia/MG</title>
<meta name="description" content="Sistemas de gestão sob medida para estúdios, salões, clínicas e pequenos negócios. Uid Software — Uberlândia/MG." />
<meta name="keywords" content="sistema de gestão, software sob medida, pequenas empresas, MEI, Uberlândia, pilates, salão de beleza" />
<meta property="og:title" content="Uid Software — Sistemas para pequenas empresas" />
<meta property="og:description" content="Chega de planilha e caos. Sistemas feitos pro seu negócio." />
```

---

## Tom de voz — regras de copy

✅ Falar com o dono de negócio diretamente ("você")
✅ Frases curtas e diretas
✅ Começar pela dor, terminar pela solução
✅ Concreto: "controle de alunos" > "gestão educacional"
✅ Humano: "a gente" > "nossa empresa"

❌ Jargão técnico pro cliente (API, backend, deploy, stack)
❌ Frases genéricas ("transformando o futuro digital")
❌ Começar seção falando da empresa antes do cliente
❌ Superlativo vazio ("a melhor solução do mercado")

---

## Ordem de execução obrigatória

```
ETAPA 1 — Base visual
  → Atualizar index.css com variáveis CSS + fontes
  → Confirmar: variáveis aplicando no browser ✅

ETAPA 2 — Estrutura e Navbar
  → Criar Navbar.jsx
  → Atualizar App.jsx com nova ordem de seções
  → Confirmar: navbar sticky funcionando + scroll suave ✅

ETAPA 3 — Hero + Pain + HowItWorks
  → Reescrever Hero.jsx
  → Criar Pain.jsx
  → Criar HowItWorks.jsx
  → Confirmar: três seções renderizando corretamente ✅

ETAPA 4 — Portfolio + Testimonial + About
  → Reescrever Portfolio.jsx
  → Criar Testimonial.jsx (com TODO)
  → Reescrever About.jsx
  → Confirmar: seções renderizando corretamente ✅

ETAPA 5 — Contact + Footer + WhatsApp
  → Ajustar Contact.jsx (manter POST /api/leads/)
  → Criar Footer.jsx
  → Criar WhatsAppButton.jsx
  → Confirmar: formulário enviando pro backend ✅

ETAPA 6 — SEO + Responsivo + Revisão final
  → Instalar react-helmet-async
  → Adicionar meta tags
  → Testar: 375px (iPhone SE) | 768px (tablet) | 1280px (desktop)
  → make test passando ✅

ETAPA 7 — Documentação
  → Atualizar CLAUDE.md com status da Fase 2
  → Registrar TODOs pendentes (screenshot Studio Fluir, WhatsApp, depoimento)
  → Fechar conversa para liberar contexto ✅
```

---

## TODOs para após a Fase 2

| # | Pendência | Responsável |
|---|-----------|-------------|
| 1 | Screenshot real do sistema Studio Fluir | Luiz Eduardo |
| 2 | Número do WhatsApp no botão flutuante | Luiz Eduardo |
| 3 | Depoimento real do Studio Fluir (foto, nome, texto) | Cliente Studio Fluir |
| 4 | Elemento visual do Hero (mockup ou animação) | Decisão na implementação |

---

## O que NÃO fazer

- ❌ Alterar a integração do formulário com `/api/leads/`
- ❌ Usar cores fora da paleta oficial Uid
- ❌ Usar Inter, Roboto ou Arial
- ❌ Começar seção About falando da empresa antes do cliente
- ❌ Deixar o Hero só com texto — precisa de elemento visual
- ❌ Alternar dark/branco/dark entre seções
- ❌ Jargão técnico no copy voltado ao cliente
- ❌ Avançar para Fase 3 sem o responsivo testado
- ❌ Criar outro `CLAUDE.md` — só atualizar o existente
- ❌ `response.data` direto — sempre `response.data.results` em listas

---

## Checklist de conclusão da Fase 2

- [ ] index.css atualizado com variáveis CSS e fontes
- [ ] Navbar sticky funcionando com scroll suave
- [ ] Hero com headline forte e elemento visual
- [ ] Pain.jsx renderizando os 4 cards de dor
- [ ] HowItWorks.jsx com 3 passos
- [ ] Portfolio com badges corretos (vermelho/azul/roxo)
- [ ] Testimonial criado com TODO comentado
- [ ] About começando pela proposta de valor
- [ ] Contact com copy atualizado e API funcionando
- [ ] Footer com CNPJ e localização
- [ ] WhatsAppButton flutuante
- [ ] react-helmet instalado e meta tags configuradas
- [ ] Responsivo testado: 375px | 768px | 1280px
- [ ] make test passando
- [ ] CLAUDE.md atualizado com status da Fase 2

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Setup + Vitrine base | ✅ Concluída |
| **Fase 2** | Reconstrução completa da Vitrine | 🔄 Em execução |
| Fase 3 | Autenticação + Gestão de Clientes | ⏳ Aguardando |
| Fase 4 | OS (Ordens de Serviço) | ⏳ Aguardando |
| Fase 5 | Financeiro | ⏳ Aguardando |
| Fase 6 | Dashboard + Form Levantamento | ⏳ Aguardando |

---

**🐷 A porca vai torcer o rabo! Bora codar, Claude Code!**

> ⚠️ Ao concluir cada etapa, atualizar o CLAUDE.md.
> Ao concluir a Fase 2, fechar a conversa para liberar contexto.

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Documento gerado em: 19/04/2026*
