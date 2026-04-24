# CLAUDE.md — Sistema Interno Uid Software

## Projeto
Sistema interno da **Uid Software e Tecnologia LTDA**  
Fundador: Luiz Eduardo Gonçalves Ferreira  
CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional  
Sede: Uberlândia/MG | Operação: 100% digital/remota

## Stack
- **Backend:** Python 3.12 + Django 5.x + Django REST Framework
- **Frontend:** React 18 + Vite + Tailwind CSS + Axios + React Router v6 + react-helmet-async
- **Banco:** PostgreSQL 16
- **Infra:** VPS Ubuntu 24.04 + Docker Compose + Nginx + Gunicorn

## Regras críticas
- Nunca SQLite — sempre PostgreSQL
- Nunca `FloatField` para dinheiro — sempre `DecimalField`
- Nunca hardcodar credenciais — sempre `.env`
- Nunca `response.data` direto em listas — sempre `response.data.results` (paginação DRF)
- Nunca comitar `.env`
- Soft delete em models futuros: `ativo = BooleanField(default=True)`
- `DEBUG=False` em produção

## Estrutura
```
SytemD/
├── backend/        ← Django (core + vitrine)
├── frontend/       ← React + Vite
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Hero.jsx
│       │   ├── Pain.jsx
│       │   ├── HowItWorks.jsx
│       │   ├── Portfolio.jsx
│       │   ├── Testimonial.jsx
│       │   ├── About.jsx
│       │   ├── Contact.jsx
│       │   ├── Footer.jsx
│       │   └── WhatsAppButton.jsx
│       └── pages/VitrinePage.jsx
├── nginx/          ← config Nginx
├── docker-compose.yml        ← dev (backend: 8002, db: 5433)
├── docker-compose.prod.yml   ← produção
├── .env.example
└── Makefile
```

## Comandos
```bash
make dev            # sobe ambiente dev
make build          # build produção
make test           # roda testes Django
make migrate        # aplica migrations
make logs           # tail logs containers
make shell          # shell Django
```

## Portas dev (local)
- Frontend: 5173
- Backend:  8002  (8000 ocupado pelo Studio Fluir)
- DB:       5433  (5432 ocupado pelo Studio Fluir)

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| **Fase 1** | Setup + Vitrine base | ✅ Concluída |
| **Fase 2** | Reconstrução completa da Vitrine Pública | ✅ Concluída |
| **Fase 3** | Bloco de Valores + Autenticação JWT + Cadastro de Clientes | 🔄 Em execução |
| Fase 4 | OS (Ordens de Serviço) | ⏳ Aguardando |
| Fase 5 | Financeiro | ⏳ Aguardando |
| Fase 6 | Dashboard + Form Levantamento | ⏳ Aguardando |

## Fase 2 — Checklist
- [x] index.css com variáveis CSS e fontes (Plus Jakarta Sans + DM Sans)
- [x] tailwind.config.js com paleta oficial Uid
- [x] Navbar sticky com scroll suave e hamburguer mobile
- [x] Hero com headline forte e grid geométrico animado
- [x] Pain.jsx — 4 cards de dor
- [x] HowItWorks.jsx — 3 passos com conectores
- [x] Portfolio com badges (vermelho/azul/roxo)
- [x] Testimonial criado com TODO comentado
- [x] About começando pela proposta de valor
- [x] Contact com novo copy e POST /api/leads/ mantido
- [x] Footer com CNPJ e localização
- [x] WhatsAppButton flutuante com pulse
- [x] react-helmet-async instalado e meta tags configuradas
- [x] make test passando (3/3)
- [ ] Responsivo testado: 375px | 768px | 1280px
- [ ] Screenshot real do Studio Fluir no Portfolio
- [ ] Número do WhatsApp real (TODOs em Contact.jsx e WhatsAppButton.jsx)
- [ ] Depoimento real do Studio Fluir (TODO em Testimonial.jsx)

## Fase 3 — Escopo

**Frente 1 — Vitrine:** Bloco de Valores no About.jsx (texto do fundador, sem bullets corporativos).

**Frente 2 — Sistema interno:**
- App `usuarios`: autenticação por **email** + JWT (simplejwt), access token em **memória** (nunca localStorage)
- App `clientes`: CRUD completo, soft delete obrigatório (`ativo=False`), todas as rotas com `IsAuthenticated`
- Frontend: AuthContext, PrivateRoute, LoginPage, Sidebar, DashboardPage (placeholder), ClientesPage

Endpoints novos: `/api/auth/token/`, `/api/auth/token/refresh/`, `/api/auth/logout/`, `/api/clientes/`

---

## Infra VPS
- Deploy via alias SSH: `vps-pcuidsoftware-root`
- nginx-proxy em host network roteia por domínio (porta 80/443)
- studio-fluir → porta interna 8001
- uid-sistema → porta interna 8002
- Novo cliente → porta 8003+ e um server block no proxy
- Renovação SSL automática via certbot no nginx-proxy
