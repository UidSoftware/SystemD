# CLAUDE.md — Sistema Interno Uid Software (SystemD)

## Projeto
Sistema interno da **Uid Software e Tecnologia LTDA**
Fundador: Luiz Eduardo Gonçalves Ferreira
CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional
Sede: Uberlândia/MG | Operação: 100% digital/remota

> ⚠️ O nome correto é **SystemD**. Containers e diretório usam `sytemd` por erro histórico — **não alterar**, pois quebra a infra.

---

## Stack
- **Backend:** Python 3.12 + Django 5.x + Django REST Framework + SimpleJWT
- **Frontend:** React 18 + Vite + Tailwind CSS + Axios + React Router v6 + PWA (vite-plugin-pwa)
- **Banco:** PostgreSQL 16
- **Email:** Mailcow Dockerized via IMAP (imapclient, porta 993 SSL) + SMTP (smtplib, porta 587 STARTTLS)
- **Infra:** VPS Ubuntu 24.04 + Docker Compose + Nginx + Gunicorn

---

## Regras críticas

| Regra | Detalhe |
|-------|---------|
| Nunca SQLite | Sempre PostgreSQL |
| Nunca FloatField | Sempre DecimalField para dinheiro |
| Nunca hardcodar credenciais | Sempre `.env` |
| Nunca commitar senha | Credenciais de email → `manage.py shell` direto na VPS |
| Nunca `response.data` direto | Sempre `response.data.results` (paginação DRF) |
| Soft delete | `ativo = BooleanField(default=True)` em todos os models |
| DEBUG=False em produção | Sempre |
| IMAP SSL desabilitado | Mailcow usa cert autoassinado no Dovecot: `check_hostname=False` / `verify_mode=CERT_NONE` |
| SMTP SSL desabilitado | Mesmo motivo: `context.check_hostname = False` / `context.verify_mode = ssl.CERT_NONE` |

---

## Estrutura

```
SytemD/
├── backend/
│   ├── core/           ← settings.py, urls.py, wsgi.py
│   ├── usuarios/       ← Usuario (auth JWT) + UsuarioEmailConfig
│   ├── clientes/       ← CRUD clientes + vínculo com Usuario
│   ├── vitrine/        ← leads da landing page pública
│   ├── email_client/   ← webmail IMAP/SMTP (sem models — só services/views)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/email/    ← EmailList, EmailDetail, EmailCompose
│   │   ├── components/sistema/  ← SistemaLayout, Sidebar, Header
│   │   ├── contexts/            ← AuthContext (JWT + interceptor Axios)
│   │   ├── pages/sistema/       ← Dashboard, Clientes, Email
│   │   └── services/            ← api.js, emailApi.js
│   ├── public/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── vite.config.js           ← PWA configurado
│   ├── Dockerfile.prod          ← build estático (target: build)
│   └── Dockerfile               ← dev (npm run dev)
├── nginx/
│   └── nginx.conf               ← serve /api → backend, / → frontend static
├── docker-compose.yml           ← dev (volumes de código, runserver)
├── docker-compose.prod.yml      ← produção (build, gunicorn, nginx, frontend-builder)
└── Makefile
```

---

## Comandos úteis

```bash
# Dev local
make dev              # sobe tudo (db + backend + frontend)
make migrate          # aplica migrations
make makemigrations   # gera migrations
make shell            # shell Django
make logs             # tail logs
make createsuperuser  # cria admin

# Produção (rodar na VPS /root/SytemD/)
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker exec sytemd-backend-1 python manage.py migrate

# Deploy frontend (OBRIGATÓRIO após qualquer mudança no frontend)
docker compose -f docker-compose.prod.yml build --no-cache frontend-builder
docker compose -f docker-compose.prod.yml run --rm frontend-builder
docker compose -f docker-compose.prod.yml restart nginx
```

> ⚠️ **O frontend em produção não tem volume de código** — usa build estático copiado para volume Docker pelo `frontend-builder`. Qualquer mudança no frontend exige os 3 comandos acima.

---

## Portas

| Ambiente | Serviço | Porta |
|----------|---------|-------|
| Dev | Frontend Vite | 5173 |
| Dev | Backend Django | 8002 |
| Dev | PostgreSQL | 5433 |
| Produção | Nginx interno | 8002 (→ nginx-proxy → 443 HTTPS) |

---

## Usuários do sistema (produção)

| ID | Email login (SystemD) | Conta email (Mailcow) |
|----|----------------------|----------------------|
| 1 | uidsoftwaretecnologia@gmail.com | contato@uidsoftware.com.br |
| 2 | luizinferrera@gmail.com | luizeduardo@uidsoftware.com.br |

Credenciais em `UsuarioEmailConfig` — jamais em código ou commits.

---

## Models principais

### Usuario (`usuarios/models.py`)
```python
class Usuario(AbstractBaseUser, PermissionsMixin):
    email     = EmailField(unique=True)   # USERNAME_FIELD
    nome      = CharField(max_length=150)
    ativo     = BooleanField(default=True)
    is_staff  = BooleanField(default=False)
```

### UsuarioEmailConfig (`usuarios/models.py`)
```python
class UsuarioEmailConfig(models.Model):
    usuario     = OneToOneField(Usuario, related_name='email_config')
    email_conta = EmailField()            # ex: luiz@empresa.com.br
    email_senha = CharField(max_length=255)  # senha Mailcow — NUNCA commitar
    ativo       = BooleanField(default=True)
```

### Cliente (`clientes/models.py`)
```python
class Cliente(models.Model):
    nome_empresa  = CharField(max_length=150)
    nome_contato  = CharField(max_length=150)
    email         = EmailField()          # email de contato (Gmail etc.)
    dominio_email = CharField(blank=True) # ex: empresacliente.com.br
    usuario       = OneToOneField(Usuario, null=True, blank=True,
                                  related_name='cliente_perfil')
    # + telefone, whatsapp, segmento, cidade, estado, cnpj_cpf, origem, observacoes
    ativo         = BooleanField(default=True)
```

---

## Email Client — app `email_client`

### Endpoints (`/api/email/`)
| Método | URL | Ação |
|--------|-----|------|
| GET | `inbox/?page=1&pasta=INBOX` | Lista emails (mais recente primeiro) |
| GET | `<uid>/?pasta=INBOX` | Lê email completo |
| POST | `enviar/` | Envia email (aceita `cc`) |
| POST | `<uid>/responder/?pasta=INBOX` | Responde email |
| DELETE | `<uid>/deletar/?pasta=INBOX` | Move para Lixeira |
| POST | `<uid>/arquivar/?pasta=INBOX` | Move para Archive |
| GET | `<uid>/anexo/?indice=0&pasta=INBOX` | Download de anexo (blob) |
| GET | `pastas/` | Lista todas as pastas IMAP |

### Parâmetro `?pasta=`
Todas as operações (listar, ler, deletar, responder) aceitam `?pasta=NOME` para operar em qualquer pasta IMAP. Default: `INBOX`.

### Pastas do Mailcow
| Nome IMAP | Label exibida |
|-----------|---------------|
| INBOX | Caixa de entrada |
| Sent | Enviados |
| Drafts | Rascunhos |
| Junk | Spam |
| Trash | Lixeira |
| Archive | Arquivo |

### Configuração no settings.py
```python
IMAP_HOST    = config('IMAP_HOST',    default='mail.uidsoftware.com.br')
IMAP_PORT    = config('IMAP_PORT',    default='993')
IMAP_USE_SSL = config('IMAP_USE_SSL', default='True')
SMTP_HOST    = config('SMTP_HOST',    default='mail.uidsoftware.com.br')
SMTP_PORT    = config('SMTP_PORT',    default='587')
SMTP_USE_TLS = config('SMTP_USE_TLS', default='True')
```

### Como vincular email a um usuário na VPS (sem commitar senha)
```bash
docker exec sytemd-backend-1 python manage.py shell -c "
from usuarios.models import Usuario, UsuarioEmailConfig
u = Usuario.objects.get(email='LOGIN_DO_USUARIO')
UsuarioEmailConfig.objects.get_or_create(
    usuario=u,
    defaults={'email_conta': 'conta@dominio.com.br', 'email_senha': 'SENHA', 'ativo': True}
)
print('OK')
"
```

---

## Frontend — Funcionalidades do Email

| Feature | Detalhe |
|---------|---------|
| Busca | Debounce 300ms, filtra por remetente e assunto na página atual |
| CC | Campo expansível no compose — botão "CC" ao lado do campo Para |
| Download anexo | Botão `⬇ nome` por anexo — blob download com JWT no header |
| Arquivar | Botão "Arquivar" move email para Archive (oculto se já estiver lá) |
| Ordem | Emails mais recentes primeiro (sort por UID desc) |
| Validação | Compose valida presença de `@` antes de enviar |

## Frontend — Layout responsivo do Email

| Breakpoint | Layout |
|------------|--------|
| Mobile (<768px) | Tela cheia: lista → detalhe → compose (estados). Botão "← Voltar". |
| Tablet (768–1023px) | Lista + leitura lado a lado. |
| Desktop (≥1024px) | 3 colunas: pastas lateral (w-48) + lista (w-72) + leitura (flex-1). |

**Tab strip de pastas (mobile + tablet):** ícones circulares `w-10 h-10`, fundo `#1a0035`, ativo `#063BF8`. Posicionado entre o header (título da pasta + "+ Novo") e a busca/lista. Mostra até 6 pastas.

---

## Auth JWT

- **Access token:** em memória React (estado), expira em 60 min
- **Refresh token:** cookie httpOnly (`Secure`, `SameSite=Lax`), expira em 7 dias, rotativo
- **Interceptor Axios:** em `AuthContext.jsx` — adiciona `Authorization: Bearer` em todas as requests
- **Renovação automática:** a cada 55 min via `POST /api/auth/token/refresh/`
- **Race condition resolvida:** `EmailPage` usa `accessToken` como dependency nos `useEffect` — só dispara chamadas IMAP quando o token existe, garantindo que o interceptor do Axios já está atualizado
- **Atenção mobile:** Android Chrome às vezes descarta cookie `Secure` ao recarregar — usuário pode precisar logar de novo se o cookie expirar

---

## PWA

- Plugin: `vite-plugin-pwa@0.21.1`
- start_url: `/sistema/` (instala o sistema, não a vitrine)
- theme_color: `#063BF8`
- Ícones: `public/icon-192.png` e `public/icon-512.png`
- Para instalar: acessar `https://uidsoftware.com.br/sistema/` → "Adicionar à tela inicial"

---

## Infra VPS (`209.50.241.122`)

| Projeto | Porta interna | Domínio |
|---------|--------------|---------|
| nginx-proxy | 80/443 | (roteia todos) |
| Studio Fluir | 8001 | — |
| **SystemD** | **8002** | uidsoftware.com.br |
| Mailcow HTTP | 8080 | — |
| Mailcow HTTPS | 8443 | mail.uidsoftware.com.br |
| Novos clientes | 8003+ | — |

- Deploy: `/root/SytemD/`
- SSL: certbot com renovação automática no nginx-proxy

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Setup + Vitrine base | ✅ |
| Fase 2 | Reconstrução completa da Vitrine Pública | ✅ |
| Fase 3 | JWT + Clientes + Email Client backend + PWA | ✅ |
| Fase 4 | Webmail frontend completo + responsivo + multi-pasta + CC + busca + download + archive | ✅ |
| Fase 5 | OS (Ordens de Serviço) | ⏳ |
| Fase 6 | Financeiro | ⏳ |
| Fase 7 | Dashboard + Form Levantamento | ⏳ |

## Roadmap email multi-cliente

| Etapa | Descrição | Status |
|-------|-----------|--------|
| Modelo `UsuarioEmailConfig` | Vincula usuário SystemD à mailbox Mailcow | ✅ |
| Modelo `Cliente.usuario` | Cliente pode ter login próprio no SystemD | ✅ |
| Frontend responsivo com pastas | Mobile/tablet/desktop | ✅ |
| Adicionar domínio cliente no Mailcow | Manual pelo painel | ⏳ Fase 2 email |
| Automatizar via API Mailcow | SystemD cria mailbox automaticamente | ⏳ Fase 3 email |
