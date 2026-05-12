# CLAUDE.md — Sistema Interno Uid Software (SystemD)

## Projeto
Sistema interno da **Uid Software e Tecnologia LTDA**
Fundador: Luiz Eduardo Gonçalves Ferreira
CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional
Sede: Uberlândia/MG | Operação: 100% digital/remota
Contato: (34) 99134-9194 | uidsoftwaretecnologia@gmail.com | www.uidsoftware.com.br

> ⚠️ O nome correto é **SystemD**. Containers e diretório usam `sytemd` por erro histórico — **não alterar**, pois quebra toda a infra.

---

## Identidade da Uid

### Quem é a empresa
A Uid não é só uma software house. É uma **boutique de tecnologia de nicho** — desenvolve sistemas sob medida e produtos digitais para MEI, micro e pequenas empresas, usando metodologia própria e IA como acelerador.

**Modelo de negócio:** ISV/SaaS vertical por segmento. Um sistema por nicho (pilates, salão, loja de roupa, clínica etc.), replicado para múltiplos clientes do mesmo segmento.
**Meta:** 10 clientes × 10 segmentos × R$200/mês = R$20.000/mês recorrente.
**Produto em produção:** Studio Fluir (nostudiofluir.com.br) — sistema de gestão para estúdio de pilates e funcional.

### Quem é o fundador
- 18 anos de experiência profissional antes de TI (1 em gráfica, 17 na mesma empresa)
- Transição de carreira para TI em 2024 | Cursando ADS Unopar desde set/2024
- Arquétipos: Performático (primário) + Criador (secundário) + Mago (terciário)
- Sombra reconhecida: dispersão, perfeccionismo, isolamento — ativamente trabalhada
- Fé cristã como âncora de valores e autoconhecimento
- Filosofia: **vira cliente do prospecto antes de propor qualquer solução**

### Origem do nome
"Uid" veio de uma aula de MySQL em 2022. A noiva, cansada de ouvir "uid uid uid", inspirou involuntariamente o nome. Ela também criou o logo (caneca de café neon vermelho/azul com "uid" dentro) e é futura co-fundadora.

### Valores (imutáveis — texto do fundador)
> "Antes de ser uma empresa de tecnologia, a Uid é uma empresa de responsabilidade."

**Respeito** — pelo tempo, pelo negócio e pela realidade do cliente. Não chegamos com solução pronta. Chegamos pra entender primeiro.

**Responsabilidade** — o sistema que entregamos tem vidas dependendo dele funcionar. Isso nunca é esquecido, nem depois da entrega, nem quando ninguém tá olhando.

A Uid foi construída pra durar além das pessoas que a fundaram. O que se deixa não é código — é a transformação real no negócio de quem confiou.

### Tom de voz
- Informal, direto, humor leve, zero frescura
- "a gente" > "nossa empresa" | "você" > cliente
- Concreto: "controle de alunos" > "gestão educacional"
- Sem jargão técnico pro cliente final
- Sem superlativo vazio ("a melhor solução do mercado")

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.12 + Django 5.x + Django REST Framework + SimpleJWT |
| Frontend | React 18 + Vite + Tailwind CSS + Axios + React Router v6 + PWA (vite-plugin-pwa) |
| Banco | PostgreSQL 16 |
| Email | Mailcow via IMAP (imapclient, porta 993 SSL) + SMTP (smtplib, porta 587 STARTTLS) |
| Filtros | django-filter 24.3 (DRF) |
| PDF | reportlab 4.2.5 (relatórios financeiros) |
| Infra | VPS Ubuntu 24.04 + Docker Compose + Nginx + Gunicorn |

---

## Regras críticas

| Regra | Detalhe |
|-------|---------|
| Nunca SQLite | Sempre PostgreSQL |
| Nunca FloatField | Sempre `DecimalField` para qualquer campo monetário |
| Nunca hardcodar credenciais | Sempre `.env` via `python-decouple` |
| Nunca commitar senha | Credenciais de email → `manage.py shell` direto na VPS |
| Nunca `response.data` direto | Sempre `response.data.results` — DRF pagina tudo |
| Soft delete | `ativo = BooleanField(default=True)` nos models de negócio; `deleted_at` nos models do financeiro |
| DEBUG=False em produção | Sempre |
| IMAP/SMTP SSL desabilitado | Mailcow usa cert autoassinado: `check_hostname=False` / `verify_mode=CERT_NONE` |
| App chamado `os` proibido | Conflita com módulo nativo Python — usar `ordens` com URLs `/api/os/` |
| LivroCaixa imutável | `ReadCreateViewSet` — nunca expor PUT/PATCH/DELETE; correções via estorno |
| FolhaPagamento sem signal | Não gera lançamento automático no LivroCaixa — por design deliberado |
| Perfil no Usuario | Sempre via `perfil` TextChoices (ADMIN/OPERACIONAL/FINANCEIRO/CLIENTE) — nunca Django Groups |
| FinanceiroTable reutilizável | Componente base para todas as telas financeiras — `src/components/sistema/FinanceiroTable.jsx` |

---

## Estrutura de apps (backend)

```
backend/
├── core/           ← settings.py, urls.py, wsgi.py
├── usuarios/       ← Usuario + Setor + Perfil + UsuarioEmailConfig + permissions.py
├── clientes/       ← CRUD clientes + vínculo com Usuario (cliente_perfil)
├── vitrine/        ← leads da landing page pública
├── email_client/   ← webmail IMAP/SMTP (sem models — só services/views)
├── ordens/         ← OS + FaseOS + Contrato + Chamado + MensagemChamado
└── financeiro/     ← 12 models financeiros + signals + relatorios + mixins
```

## Estrutura de páginas (frontend)

```
src/
├── contexts/
│   └── AuthContext.jsx          ← JWT em memória + /api/auth/me/ + interceptor Axios
├── components/sistema/
│   ├── SistemaLayout.jsx        ← layout base com Sidebar + Header
│   ├── Sidebar.jsx              ← dinâmica por perfil + submenu Financeiro expansível
│   ├── PrivateRoute.jsx         ← aceita perfisPermitidos[]
│   └── FinanceiroTable.jsx      ← tabela, modais, badges, formatadores reutilizáveis
├── pages/sistema/
│   ├── DashboardPage.jsx
│   ├── ClientesPage.jsx
│   ├── EmailPage.jsx
│   ├── OSPage.jsx               ← listagem com busca + filtro + badges
│   ├── OSDetailPage.jsx         ← 4 abas: Resumo, Timeline, Contrato, Chamados
│   ├── UsuariosPage.jsx         ← CRUD admin + badges de perfil
│   ├── SetoresPage.jsx
│   ├── financeiro/              ← 12 telas (contas, livro-caixa, contas-pagar, etc.)
│   └── portal/                  ← MeusProjetos, Suporte, MinhasFaturas (perfil CLIENTE)
└── services/
    ├── api.js                   ← instância Axios base
    ├── emailApi.js              ← IMAP/SMTP
    ├── osApi.js                 ← OS + contrato + chamados + mensagens
    ├── adminApi.js              ← usuários + setores
    ├── financeiroApi.js         ← todos os endpoints /api/financeiro/
    └── portalApi.js             ← portal do cliente (legado — preferir osApi.js)
```

---

## Usuários do sistema (produção)

| Email login | Perfil | Conta email Mailcow |
|-------------|--------|---------------------|
| uidsoftwaretecnologia@gmail.com | ADMIN | contato@uidsoftware.com.br |
| luizinferrera@gmail.com | ADMIN | luizeduardo@uidsoftware.com.br |

Credenciais em `UsuarioEmailConfig` — jamais em código ou commits.

---

## Perfis de usuário e permissões

| Perfil | Cor badge | Acesso |
|--------|-----------|--------|
| ADMIN | `#FF0000` | Tudo |
| OPERACIONAL | `#063BF8` | Clientes, OS, Email |
| FINANCEIRO | `#10b981` | Financeiro, Email |
| CLIENTE | `#3d0361` | Portal próprio (MeusProjetos, Suporte, MinhasFaturas) |

**Permissões DRF** (`usuarios/permissions.py`):
- `IsAdmin` — só ADMIN
- `IsAdminOrOperacional` — Clientes, OS
- `IsAdminOrFinanceiro` — Financeiro
- `IsAdminOrOperacionalOrFinanceiro` — Email

**AuthContext:** após login/refresh, chama `/api/auth/me/` e armazena `{ id, nome, email, perfil, setor, email_corporativo }` no estado global.

---

## Models principais

### Usuario + Setor (`usuarios/models.py`)
```python
class Perfil(models.TextChoices):
    ADMIN = 'ADMIN' | FINANCEIRO = 'FINANCEIRO' | OPERACIONAL = 'OPERACIONAL' | CLIENTE = 'CLIENTE'

class Setor(models.Model):
    nome, descricao, ativo, criado_em
    # Fixture: Diretoria | Comercial | Desenvolvimento | Financeiro | Suporte | Cliente

class Usuario(AbstractBaseUser, PermissionsMixin):
    email, nome, ativo, is_staff, criado_em
    perfil = CharField(choices=Perfil)   # default: OPERACIONAL
    setor  = ForeignKey(Setor, null=True)
```

### UsuarioEmailConfig (`usuarios/models.py`)
```python
class UsuarioEmailConfig(models.Model):
    usuario     = OneToOneField(Usuario, related_name='email_config')
    email_conta = EmailField()       # ex: luiz@uidsoftware.com.br
    email_senha = CharField(255)     # senha Mailcow — NUNCA commitar
    ativo       = BooleanField(default=True)
```

### Cliente (`clientes/models.py`)
```python
class Cliente(models.Model):
    nome_empresa, nome_contato, email, dominio_email
    usuario  = OneToOneField(Usuario, null=True, related_name='cliente_perfil')
    # + telefone, whatsapp, segmento, cidade, estado, cnpj_cpf, origem, observacoes
    ativo    = BooleanField(default=True)
```

### OS + relacionados (`ordens/models.py`)
```python
class StatusOS(TextChoices):
    LEAD | REUNIAO | LEVANTAMENTO | PROPOSTA | CONTRATO | DEV | ENTREGA | MANUTENCAO | CANCELADA

class OS(models.Model):
    cliente, titulo, descricao, status, responsavel
    valor_total, valor_entrada, valor_mensal (DecimalField)
    data_inicio, data_entrega, observacoes, ativo, criado_em, atualizado_em

class FaseOS(models.Model):   # imutável — nunca editar/deletar
    os, fase, descricao, responsavel, criado_em

class Contrato(models.Model):  # OneToOne com OS
    numero, valor_total, valor_entrada, percentual_entrada, valor_mensal, data_assinatura

class Chamado(models.Model):
    os, aberto_por, titulo, descricao, prioridade, status, ativo

class MensagemChamado(models.Model):  # imutável — histórico preservado
    chamado, autor, mensagem, criado_em
```

### Financeiro (`financeiro/models.py`) — todos herdam de `BaseModel`
```
Conta | PlanoContas | Fornecedor | ServicoProduto | Produto
ContasPagar | ContasReceber | PlanosPagamentos | ClientePlano
LivroCaixa (imutável) | FolhaPagamento | Pedido + PedidoItem
```
`BaseModel` tem: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `deleted_by`

---

## Endpoints por app

### Auth (`/api/auth/`)
| Endpoint | Acesso |
|----------|--------|
| `POST token/` | Login JWT |
| `POST token/refresh/` | Renova via cookie httpOnly |
| `POST logout/` | Apaga cookie |
| `GET me/` | Perfil completo do usuário logado |
| `GET/POST usuarios/` | CRUD usuários — só ADMIN |
| `GET/POST setores/` | CRUD setores — só ADMIN |

### Clientes (`/api/clientes/`)
CRUD completo — ADMIN e OPERACIONAL

### Email (`/api/email/`)
| Endpoint | Ação |
|----------|------|
| `GET inbox/?page=&pasta=` | Lista emails (mais recente primeiro) |
| `GET <uid>/?pasta=` | Lê email completo |
| `POST enviar/` | Envia (aceita `cc`) |
| `POST <uid>/responder/?pasta=` | Responde |
| `DELETE <uid>/deletar/?pasta=` | Move para Lixeira |
| `POST <uid>/arquivar/?pasta=` | Move para Archive |
| `GET <uid>/anexo/?indice=&pasta=` | Download de anexo (blob) |
| `GET pastas/` | Lista todas as pastas IMAP |

### OS (`/api/os/` e `/api/chamados/`)
| Endpoint | Permissão |
|----------|-----------|
| `GET/POST os/` | ADMIN, OPERACIONAL |
| `GET/PATCH/DELETE os/{id}/` | ADMIN, OPERACIONAL |
| `POST os/{id}/avancar/` | ADMIN, OPERACIONAL — muda status + registra FaseOS |
| `POST os/{id}/cancelar/` | ADMIN, OPERACIONAL — encerra com motivo |
| `GET/POST os/{id}/contrato/` | ADMIN criar/editar |
| `GET/POST os/{id}/chamados/` | Criar: todos; ver: ADMIN/OPERACIONAL |
| `GET/POST chamados/` | ADMIN, OPERACIONAL (CLIENTE vê só os próprios) |
| `GET/POST chamados/{id}/mensagens/` | Todos autenticados |

### Financeiro (`/api/financeiro/`)
```
CRUD: contas/ | plano-contas/ | fornecedores/ | servicos-produtos/ | produtos/
      contas-pagar/ | contas-receber/ | planos-pagamentos/ | cliente-plano/
      livro-caixa/ (GET+POST apenas) | folha-pagamento/ | pedidos/
Ações:
  GET  livro-caixa/totais/
  GET  produtos/alertas-estoque/
  POST pedidos/{id}/confirmar/
  GET  pedidos/{id}/recibo/          (PDF)
  POST transferencia/
  POST gerar-mensalidades/
Relatórios:
  GET  relatorios/dre/?ano=&mes=
  GET  relatorios/dre/pdf/
  GET  relatorios/fluxo-caixa/?meses=3
  GET  relatorios/fluxo-caixa/pdf/
  GET  relatorios/extrato/
```

---

## Auth JWT

- **Access token:** em memória React (estado), expira em 60 min
- **Refresh token:** cookie httpOnly (`Secure`, `SameSite=Lax`), expira em 7 dias, rotativo
- **Interceptor Axios:** em `AuthContext.jsx` — adiciona `Authorization: Bearer` em todas as requests
- **Renovação automática:** a cada 55 min via `POST /api/auth/token/refresh/`
- **Race condition resolvida:** `useEffect` dependente de `accessToken` — só dispara quando o token existe
- **Atenção mobile:** Android Chrome às vezes descarta cookie `Secure` ao recarregar — usuário pode precisar logar de novo

---

## Email Client — detalhes operacionais

### Pastas IMAP do Mailcow
| Nome IMAP | Label |
|-----------|-------|
| INBOX | Caixa de entrada |
| Sent | Enviados |
| Drafts | Rascunhos |
| Junk | Spam |
| Trash | Lixeira |
| Archive | Arquivo |

### Vincular email a usuário na VPS (sem commitar senha)
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

## Financeiro — signals automáticos

| Evento | Resultado |
|--------|-----------|
| `ContasPagar.pag_status = 'pago'` | LivroCaixa saída (exceto pró-labore) |
| `ContasReceber.rec_status = 'recebido'` | LivroCaixa entrada |
| `Pedido.ped_status = 'pago'` (à vista) | LivroCaixa entrada + reduz estoque |
| `Pedido.ped_status = 'pago'` (futuro) | Cria ContasReceber em parcelas + reduz estoque |

Todos usam `select_for_update()` + `transaction.atomic()` contra race condition.

### Vincular ContasReceber a cliente SystemD
```javascript
// rec_cliente_id é IntegerField genérico — sem FK direta
{ rec_cliente_id: cliente.id, rec_nome_pagador: cliente.nome_empresa, ... }
```

### Gerar mensalidades (cron sugerido)
```bash
# todo dia 27 às 08:00
docker exec sytemd-backend-1 python manage.py gerar_mensalidades
```

---

## PWA

- Plugin: `vite-plugin-pwa@0.21.1`
- `start_url`: `/sistema/` — instala o sistema, não a vitrine
- `theme_color`: `#063BF8`
- Ícones: `public/icon-192.png` e `public/icon-512.png`
- Para instalar: `https://uidsoftware.com.br/sistema/` → "Adicionar à tela inicial"

---

## Identidade Visual

### Paleta oficial (imutável)
```css
--color-brand-blue:   #063BF8;   /* Azul Royal — CTAs, botões, destaques */
--color-brand-red:    #FF0000;   /* Vermelho — urgência, badge ADMIN, erro */
--color-brand-purple: #3d0361;   /* Roxo escuro — backgrounds */
--color-bg-dark:      #0a0014;   /* fundo principal */
--color-bg-mid:       #1a0a2e;   /* cards, seções secundárias */
--color-text-main:    #f1f5f9;
--color-text-muted:   #a78bca;
--color-text-accent:  #6b8fff;
--color-success:      #10b981;   /* verde — pago, ativo, positivo */
--color-warning:      #f59e0b;   /* amarelo — pendente, atenção */
```

### Gradiente oficial
```css
background: linear-gradient(135deg, #0a0014 0%, #3d0361 50%, #063BF8 100%);
```

### Tipografia
- Display / headlines: **Plus Jakarta Sans** (700, 800)
- Body: **DM Sans** (400, 500, 600)
- ❌ Nunca Inter, Roboto ou Arial

### Padrão de componentes inline
Não usamos Radix UI, TanStack Query ou outras libs de componente. Tudo em inline styles com a paleta acima. `FinanceiroTable.jsx` é o exemplo canônico de reutilização.

---

## Infra VPS (`209.50.241.122`)

| Projeto | Porta interna | Domínio |
|---------|--------------|---------|
| nginx-proxy | 80/443 | (roteia todos) |
| Studio Fluir | 8001 | nostudiofluir.com.br |
| **SystemD** | **8002** | uidsoftware.com.br |
| Mailcow HTTP | 8080 | — |
| Mailcow HTTPS | 8443 | mail.uidsoftware.com.br |
| Novos clientes | 8003+ | — |

- Deploy: `/root/SytemD/`
- SSL: certbot com renovação automática no nginx-proxy

---

## Comandos úteis

```bash
# Dev local
make dev              # sobe db + backend + frontend
make migrate          # aplica migrations
make makemigrations   # gera migrations
make shell            # shell Django
make logs             # tail logs
make createsuperuser  # cria admin

# Produção — rodar na VPS em /root/SytemD/
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker exec sytemd-backend-1 python manage.py migrate

# Deploy frontend (OBRIGATÓRIO após qualquer mudança no frontend)
docker compose -f docker-compose.prod.yml build --no-cache frontend-builder
docker compose -f docker-compose.prod.yml run --rm frontend-builder
docker compose -f docker-compose.prod.yml restart nginx
```

> ⚠️ **Frontend em produção não tem volume de código** — build estático via `frontend-builder`. Qualquer alteração no frontend exige os 3 comandos acima.

### Fixtures (carregar na VPS após migrate)
```bash
docker exec sytemd-backend-1 python manage.py loaddata setores
```

### Corrigir permissões de arquivos criados pelo Docker
```bash
docker run --rm -v /home/uidsoftware/CODE/SystemD/backend:/app python:3.12-slim chown -R 1000:1000 /app/<diretorio>/
```

---

## Portas

| Ambiente | Serviço | Porta |
|----------|---------|-------|
| Dev | Frontend Vite | 5173 |
| Dev | Backend Django | 8002 |
| Dev | PostgreSQL | 5433 |
| Produção | Nginx interno | 8002 (→ nginx-proxy → 443 HTTPS) |

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Setup + Vitrine base | ✅ |
| Fase 2 | Reconstrução completa da Vitrine Pública | ✅ |
| Fase 3 | JWT + Clientes + Email Client backend + PWA | ✅ |
| Fase 4 | Webmail frontend completo + responsivo + multi-pasta + CC + busca + download + archive | ✅ |
| Fase 5 | Perfis + Setores + Permissões DRF + Portal do Cliente + Telas Admin | ✅ |
| Fase 6 | OS — Ordens de Serviço (models + API + frontend 4 abas + portal cliente) | ✅ |
| Fase 7 | Financeiro — 12 models + signals + relatórios + 12 telas frontend | ✅ |
| **Fase 8** | Dashboard + Form Levantamento de Requisitos | ⏳ |

---

## Roadmap email multi-cliente

| Etapa | Status |
|-------|--------|
| Modelo `UsuarioEmailConfig` vincula usuário à mailbox Mailcow | ✅ |
| Modelo `Cliente.usuario` — cliente pode ter login próprio | ✅ |
| Frontend responsivo com multi-pasta | ✅ |
| Adicionar domínio cliente no Mailcow (manual pelo painel) | ⏳ |
| Automatizar via API Mailcow — SystemD cria mailbox automaticamente | ⏳ |

---

## Pipeline de desenvolvimento Uid

```
Claude.ai (análise + documentação + Instruções de Fase)
    ↓
Claude Code (execução)
    ↓
CLAUDE.md (âncora do projeto — atualizar ao fim de cada fase)
```

Fluxo padrão de novos projetos:
```
Levantamento → UML → Skills → código-base → protótipo → contrato → produção → mensalidade
```

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Última atualização: 12/05/2026*
