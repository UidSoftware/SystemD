# CLAUDE.md — Sistema Interno Uid Software (SystemD)

## Projeto
Sistema interno da **Uid Software e Tecnologia LTDA**  
Fundador: Luiz Eduardo Gonçalves Ferreira  
CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional  
Sede: Uberlândia/MG | Operação: 100% digital/remota

> ⚠️ O nome correto do sistema é **SystemD**. Containers e diretório usam `sytemd` por erro de digitação histórico — não alterar para não quebrar infra.

## Stack
- **Backend:** Python 3.12 + Django 5.x + Django REST Framework + SimpleJWT
- **Frontend:** React 18 + Vite + Tailwind CSS + Axios + React Router v6 + react-helmet-async + **PWA (vite-plugin-pwa)**
- **Banco:** PostgreSQL 16
- **Email:** Mailcow Dockerized — IMAP via imapclient (porta 993 SSL), SMTP via smtplib (porta 587 STARTTLS)
- **Infra:** VPS Ubuntu 24.04 + Docker Compose + Nginx + Gunicorn

## Regras críticas
- Nunca SQLite — sempre PostgreSQL
- Nunca `FloatField` para dinheiro — sempre `DecimalField`
- Nunca hardcodar credenciais — sempre `.env`
- Nunca `response.data` direto em listas — sempre `response.data.results` (paginação DRF)
- Nunca comitar `.env`
- Soft delete em models: `ativo = BooleanField(default=True)`
- `DEBUG=False` em produção
- IMAP usa SSL com `check_hostname=False` / `verify_mode=CERT_NONE` — Mailcow usa certificado autoassinado no Dovecot (porta 993)

## Estrutura
```
SytemD/
├── backend/
│   ├── core/           ← settings, urls, wsgi
│   ├── usuarios/       ← auth JWT, model Usuario + UsuarioEmailConfig
│   ├── clientes/       ← CRUD clientes
│   ├── vitrine/        ← leads da landing page
│   ├── email_client/   ← webmail IMAP/SMTP
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── services/
│   ├── public/
│   │   ├── icon-192.png   ← ícone PWA
│   │   └── icon-512.png   ← ícone PWA
│   ├── vite.config.js     ← PWA configurado
- [x] Sidebar responsiva com menu retratil no mobile (hamburger + overlay)
- [x] SistemaLayout centralizado para Dashboard, Clientes e Email
- [x] Webmail integrado: EmailPage, EmailList, EmailDetail, EmailCompose
│   └── Dockerfile.prod
├── nginx/
├── docker-compose.yml        ← dev
├── docker-compose.prod.yml   ← produção
└── Makefile
```

## Comandos
```bash
make dev            # sobe ambiente dev
make build          # build produção
make migrate        # aplica migrations
make logs           # tail logs containers
make shell          # shell Django
```

## Portas dev (local)
- Frontend: 5173
- Backend:  8002  (8000 ocupado pelo Studio Fluir)
- DB:       5433  (5432 ocupado pelo Studio Fluir)

## Usuários do sistema
| ID | Email | Conta email vinculada |
|----|-------|----------------------|
| 1  | uidsoftwaretecnologia@gmail.com | contato@uidsoftware.com.br |
| 2  | luizinferrera@gmail.com | *(não vinculado — uso pessoal)* |

## Email Client — app `email_client`
- **Endpoints:** `/api/email/inbox/`, `/api/email/enviar/`, `/api/email/pastas/`, `/api/email/<uid>/`, `/api/email/<uid>/responder/`, `/api/email/<uid>/deletar/`
- **Credenciais:** armazenadas em `UsuarioEmailConfig` (OneToOne → Usuario)
- **IMAP:** `mail.uidsoftware.com.br:993` SSL (cert autoassinado — verificação desabilitada)
- **SMTP:** `mail.uidsoftware.com.br:587` STARTTLS
- **Próximo passo:** frontend React do webmail (EmailPage, EmailList, EmailDetail, EmailCompose)

## PWA
- Plugin: `vite-plugin-pwa@0.21.1`
- Nome: `Uid Software` / short_name: `Uid`
- Ícones gerados a partir do logo em `public/icon-192.png` e `public/icon-512.png`
- Manifest servindo em `/manifest.webmanifest`

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| **Fase 1** | Setup + Vitrine base | ✅ Concluída |
| **Fase 2** | Reconstrução completa da Vitrine Pública | ✅ Concluída |
| **Fase 3** | Autenticação JWT + Cadastro de Clientes + Email Client backend + PWA | ✅ Concluída |
| **Fase 4** | Frontend webmail + telas do sistema | 🔄 Próxima |
| Fase 5 | OS (Ordens de Serviço) | ⏳ Aguardando |
| Fase 6 | Financeiro | ⏳ Aguardando |
| Fase 7 | Dashboard + Form Levantamento | ⏳ Aguardando |

## Fase 3 — Checklist
- [x] App `usuarios` com auth JWT (access em memória, refresh em cookie httpOnly)
- [x] App `clientes` com CRUD completo e soft delete
- [x] Model `UsuarioEmailConfig` — vincula usuário à conta IMAP
- [x] App `email_client` — IMAP/SMTP integrado ao Mailcow
- [x] Endpoint `/api/email/inbox/` testado e funcionando
- [x] Envio SMTP testado e funcionando (SSL desabilitado — cert autoassinado Mailcow)
- [x] PWA configurado com manifest, service worker e ícones
- [x] Sidebar responsiva com menu retratil no mobile (hamburger + overlay)
- [x] SistemaLayout centralizado para Dashboard, Clientes e Email
- [x] Webmail integrado: EmailPage, EmailList, EmailDetail, EmailCompose
- [ ] Responsivo testado: 375px | 768px | 1280px
- [ ] Número do WhatsApp real (TODOs em Contact.jsx e WhatsAppButton.jsx)
- [ ] Depoimento real do Studio Fluir (TODO em Testimonial.jsx)

## Infra VPS
- Deploy: `/root/SytemD/` na VPS `209.50.241.122`
- nginx-proxy em host network roteia por domínio (porta 80/443)
- studio-fluir → porta interna 8001
- uid-sistema (SystemD) → porta interna 8002
- Novo cliente → porta 8003+
- Renovação SSL automática via certbot no nginx-proxy
