# Instrucao_Claude_Code_Fase1.md
# Sistema: Uid Software — Sistema Interno
# Fase 1 — Setup do Projeto + Vitrine Pública
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.

---

## Antes de começar

1. Leia o `CLAUDE.md` completo — ele é a memória do projeto
2. Leia o `Dicionario_Dados.md` — antes de criar qualquer model
3. Leia o `Regras_Negocio.md` — antes de qualquer lógica de negócio
4. Confirme a stack no `Arquitetura_Tecnica.md`
5. Só então escreva código

---

## Contexto rápido

Sistema interno da **Uid Software e Tecnologia LTDA** — desenvolvido pelo próprio fundador.
Dois módulos principais: **Vitrine Pública** (apresentação da empresa) e **Gestão Interna** (clientes, contratos, projetos, financeiro).
Esta fase cobre exclusivamente o setup da infra + o módulo Vitrine.

- Fundador: Luiz Eduardo Gonçalves Ferreira
- CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional
- Sede: Uberlândia/MG | Operação: 100% digital/remota
- Stack: Django + React | Infra: VPS Ubuntu 24.04 + Docker Compose + Nginx + Gunicorn

---

## Escopo da Fase 1

### ✅ O que entra nesta fase

| # | Entrega | Descrição |
|---|---------|-----------|
| 1 | Setup do projeto | Estrutura de pastas, Docker Compose, variáveis de ambiente |
| 2 | Backend base | Django configurado, apps criados, admin operacional |
| 3 | Frontend base | React + Vite inicializado, roteamento base configurado |
| 4 | Vitrine — Hero | Seção inicial com nome, tagline e CTA |
| 5 | Vitrine — Sobre | Quem é a Uid, missão, valores |
| 6 | Vitrine — Portfolio | Cards de sistemas (Studio Fluir e placeholders) |
| 7 | Vitrine — Contato | Formulário de captura de lead (salva no banco) |
| 8 | Model Lead | Tabela para guardar os dados do formulário de contato |
| 9 | CI básico | Docker build sem erro, testes passando |

### ❌ O que NÃO entra nesta fase

- Módulo de gestão interna (clientes, contratos, projetos, financeiro)
- Sistema de levantamento de requisitos (form analista)
- Autenticação / login
- Dashboard
- Qualquer integração externa (email, WhatsApp, etc.)

---

## Arquitetura esperada ao final da Fase 1

```
uid-sistema/
├── backend/
│   ├── core/               ← app principal (settings, urls raiz)
│   ├── vitrine/            ← app da vitrine pública (Lead model)
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── VitrinePage.jsx
│   │   ├── components/
│   │   │   ├── Hero.jsx
│   │   │   ├── Sobre.jsx
│   │   │   ├── Portfolio.jsx
│   │   │   └── Contato.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── CLAUDE.md
└── Makefile
```

---

## Model obrigatório nesta fase

### Lead (app: vitrine)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | AutoField PK | — |
| `nome` | CharField(100) | Nome do interessado |
| `email` | EmailField | Email para contato |
| `telefone` | CharField(20, blank=True) | Telefone opcional |
| `empresa` | CharField(100, blank=True) | Nome da empresa |
| `mensagem` | TextField | Texto livre da solicitação |
| `origem` | CharField(50) | Onde clicou (ex: 'vitrine_contato') |
| `criado_em` | DateTimeField(auto_now_add=True) | — |
| `lido` | BooleanField(default=False) | Controle interno — lido pelo admin |

> Registrar no Django Admin com `list_display`, `list_filter` por `lido` e `criado_em`.

---

## Padrões obrigatórios

### Backend (Django)
- Python 3.12 | Django 5.x | Django REST Framework
- Banco: PostgreSQL (nunca SQLite em produção)
- Variáveis sensíveis: sempre via `.env` — nunca hardcoded
- Soft delete: usar `ativo = BooleanField(default=True)` em models futuros (não aplica ao Lead)
- Dinheiro: sempre `DecimalField` — nunca `FloatField`
- CORS configurado para aceitar o frontend React
- `DEBUG=False` no `.env.prod`

### Frontend (React)
- React 18 + Vite + Tailwind CSS
- Axios para chamadas à API
- Responsivo — mobile first (o cliente final é MEI, acessa pelo celular)
- Roteamento com React Router v6
- Sem `response.data` direto em listas — sempre `response.data.results` (paginação DRF)

### Docker
- `docker-compose.yml` para dev (sem SSL, volumes montados)
- `docker-compose.prod.yml` para produção (Gunicorn, Nginx, SSL via Certbot)
- Serviços mínimos: `db`, `backend`, `frontend`, `nginx`

### Makefile — comandos padrão Uid
```bash
make dev          # sobe ambiente de desenvolvimento
make build        # build de produção
make test         # roda testes Django
make migrate      # aplica migrations
make logs         # tail dos logs dos containers
make shell        # acessa shell Django
```

---

## Endpoint esperado ao final da Fase 1

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/leads/` | Recebe dados do formulário de contato |

Retorno esperado (POST com sucesso):
```json
{
  "id": 1,
  "mensagem": "Solicitação recebida com sucesso!"
}
```

---

## Ordem de execução obrigatória

```
ETAPA 1 — Estrutura base
  → Criar estrutura de pastas
  → docker-compose.yml dev
  → .env.example
  → Makefile
  → Confirmar: make dev sobe sem erro ✅

ETAPA 2 — Backend Django
  → Inicializar projeto Django
  → Criar app vitrine
  → Criar model Lead + migration
  → Registrar no admin
  → Criar endpoint POST /api/leads/
  → Confirmar: make test passa ✅

ETAPA 3 — Frontend React
  → Inicializar Vite + React
  → Instalar dependências (Tailwind, Axios, React Router)
  → Criar componentes: Hero, Sobre, Portfolio, Contato
  → Conectar formulário Contato → POST /api/leads/
  → Confirmar: vitrine renderiza no browser ✅

ETAPA 4 — Integração e revisão
  → Testar fluxo completo: preencher form → salvar no banco
  → Checar responsividade no mobile
  → Checar CORS funcionando entre frontend e backend
  → Confirmar: make test passa ✅

ETAPA 5 — Documentação final
  → Atualizar CLAUDE.md com status da Fase 1
  → Anotar qualquer decisão técnica relevante
  → Fechar conversa para liberar contexto ✅
```

---

## O que NÃO fazer

- ❌ Criar sistema de login nesta fase
- ❌ Usar SQLite — sempre PostgreSQL
- ❌ Float para campos monetários
- ❌ Hardcodar qualquer credencial no código
- ❌ `response.data` direto — sempre `response.data.results` em listas
- ❌ Avançar para Fase 2 sem os testes da Fase 1 passando
- ❌ Criar outro `CLAUDE.md` — existe um na raiz, só atualize
- ❌ Comitar `.env`

---

## Troubleshooting comum

| Erro | Causa provável | Solução |
|------|----------------|---------|
| CORS bloqueado no browser | `CORS_ALLOWED_ORIGINS` não configurado | Adicionar URL do frontend no `.env` |
| Migration pendente | Model criado mas migration não rodada | `make migrate` |
| Container `db` não inicia | Porta 5432 em uso | Verificar serviço PostgreSQL local rodando |
| Tailwind não aplica estilos | `content` no `tailwind.config.js` incorreto | Incluir `./src/**/*.{js,jsx}` |
| Vite não encontra `.env` | Variáveis sem prefixo `VITE_` | Prefixar com `VITE_` no `.env` |

---

## Checklist de conclusão da Fase 1

- [ ] Estrutura de pastas criada conforme especificado
- [ ] `make dev` sobe sem erro
- [ ] Model `Lead` criado e registrado no admin
- [ ] Endpoint `POST /api/leads/` funcionando
- [ ] Componentes Hero, Sobre, Portfolio, Contato implementados
- [ ] Formulário conectado à API — salva lead no banco
- [ ] Vitrine responsiva (testado em mobile)
- [ ] `make test` passa sem erros
- [ ] `.env.example` documentado com todas as variáveis
- [ ] `CLAUDE.md` atualizado com status da Fase 1

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| **Fase 1** | Setup + Vitrine Pública | 🔄 Em execução |
| Fase 2 | Autenticação + Cadastro de Clientes | ⏳ Aguardando |
| Fase 3 | Contratos + Mensalidades | ⏳ Aguardando |
| Fase 4 | Projetos + Fases | ⏳ Aguardando |
| Fase 5 | Financeiro + Dashboard | ⏳ Aguardando |
| Fase 6 | Form de Levantamento de Requisitos | ⏳ Aguardando |

---

**🐷 A porca vai torcer o rabo! Bora codar, Claude Code!**

> ⚠️ Ao concluir cada etapa, atualizar o CLAUDE.md.
> Ao concluir a Fase 1 inteira, fechar a conversa para liberar contexto.

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Documento gerado em: 19/04/2026*
