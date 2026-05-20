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
| Leads sem DELETE | Soft delete via `convertido=True` — endpoint DELETE retorna 405 por design |
| Entrega `registrado_por` | Campo `read_only` no serializer — preenchido via `perform_create(registrado_por=request.user)` |
| Multi-tenant Entregas | Todo queryset de CLIENTE **obrigatoriamente** filtra por `empresa=cliente_perfil` — nunca `Entrega.objects.all()` sem filtro |
| Prospecto sem `tem_entregas` | Campo `tem_entregas` existe só em `Cliente` — nunca adicionar ao Prospecto |
| Unidades sem menu próprio | `UnidadesPage` existe como rota mas sem item na Sidebar — gerenciamento via modal dentro de `EntregasPage` (botão ⊡ Unidades no header) |
| Deploy: sempre pull primeiro | Na VPS, `git pull` **antes** de qualquer `docker compose build` — nunca buildar sem sincronizar o código |
| `<select>` — overflow e cor | **Overflow:** `SistemaLayout` não usa `overflow-hidden` no root/content-column (clipa popup nativo no Linux Chrome/Opera); modal nunca usa `overflowY:'auto'`/`max-h-*` no container; card de filtro usa `overflow:'visible'` sobre `cardStyle`. **Cor das options:** browser ignora estilos inline — usar CSS global `select option { background-color:#1a0a2e; color:#f1f5f9 }` em `index.css`. Chrome no Windows/macOS ignora essa regra (limitação do SO) — substituição por componente customizado fica para versão futura |

---


---

## Padrão Mobile First (aplicado em todas as telas)

Todas as páginas de listagem usam o padrão:
- **Mobile** (`md:hidden`): cards com campos principais em grid 2 colunas e botões full-width
- **Desktop** (`hidden md:block`): tabela completa

### Estrutura dos cards
```jsx
// Mobile — cards (CORRETO: sem inline display — conflita com md:hidden)
<div className="md:hidden flex flex-col gap-3">
  {items.map(item => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
      {/* campos em grid 1fr 1fr */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        <div><span style={{ color: '#6b6b8a', fontSize: 11 }}>Label</span><br/><span style={{ color: '#e2d9f3' }}>Valor</span></div>
      </div>
      {/* botoes full-width */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={{ flex: 1, padding: '8px 0', borderRadius: 8 }}>Ação</button>
      </div>
    </div>
  ))}
</div>

// Desktop — tabela
<div className="hidden md:block">
  <table>...</table>
</div>
```

### Páginas convertidas
Leads, Prospectos, OS, Clientes, Entregas, Usuários, Setores, Unidades,
MinhasFaturas + financeiro via FinanceiroTable.jsx (componente compartilhado)

### Armadilha: inline display sobrescreve md:hidden
`style={{ display: 'flex' }}` tem precedência sobre classes Tailwind.
O correto é usar SOMENTE classes: `className="md:hidden flex flex-col gap-3"`.
Nunca combinar `className="md:hidden"` com `style={{ display: 'flex' }}`.

### FinanceiroTable.jsx
Componente reutilizável em `src/components/sistema/FinanceiroTable.jsx`.
Já inclui mobile cards — todas as 8 telas financeiras herdam automaticamente.

## Estrutura de apps (backend)

```
backend/
├── core/           ← settings.py, urls.py, wsgi.py
├── usuarios/       ← Usuario + Setor + Perfil + UsuarioEmailConfig + permissions.py
├── clientes/       ← CRUD clientes + tem_entregas + enviar-acesso/ (cria usuário CLIENTE + email)
├── vitrine/        ← leads da landing page pública + gestão de Leads
├── prospectos/     ← Prospecto (Lead qualificado) + converter → Cliente
├── entregas/       ← Unidade + Entrega multi-tenant + confirmação CLIENTE + export PDF/Excel
├── email_client/   ← webmail IMAP/SMTP (sem models — só services/views)
├── ordens/         ← OS + FaseOS + Contrato + Chamado + MensagemChamado
└── financeiro/     ← 12 models financeiros + signals + relatorios + mixins
```

## Estrutura de páginas (frontend)

```
src/
├── contexts/
│   └── AuthContext.jsx          ← JWT + /api/auth/me/ + redirecionarPosLogin + alterar-senha
│                                  ⚠️ useEffect filho roda antes do pai — pages usam tokenRef
│                                  para passar Authorization explícito, sem depender do interceptor
├── components/sistema/
│   ├── SistemaLayout.jsx        ← layout base com Sidebar + Header (main overflow-y-auto)
│   ├── Sidebar.jsx              ← dinâmica por perfil + submenu Financeiro + modal alterar-senha
│   ├── PrivateRoute.jsx         ← aceita perfisPermitidos[]
│   └── FinanceiroTable.jsx      ← tabela, modais, badges, formatadores reutilizáveis
├── pages/sistema/
│   ├── DashboardPage.jsx
│   ├── LeadsPage.jsx            ← listagem + mensagem na tabela + ao vivo (polling 30s) + converter → Prospecto
│   ├── ProspectosPage.jsx       ← CRUD + converter → Cliente (só ADMIN)
│   ├── EntregasPage.jsx         ← multi-tenant + Solicitante/Unidade/De/Para/Motoboy + editar/excluir por linha + botão ⊡ Unidades (modal CRUD inline) + exportar PDF/Excel
│   ├── UnidadesPage.jsx         ← rota existe (/sistema/unidades) mas sem item no menu — gestão via modal dentro de EntregasPage
│   ├── ClientesPage.jsx         ← toggle tem_entregas + botão Criar/Enviar acesso (só ADMIN)
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
    ├── entregasApi.js           ← /api/entregas/ + /api/unidades/
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
| OPERACIONAL | `#063BF8` | Leads, Prospectos, Clientes, OS, Entregas, Email |
| FINANCEIRO | `#10b981` | Financeiro, Email |
| CLIENTE | `#3d0361` | Portal (MeusProjetos, Suporte, MinhasFaturas) + Entregas se `tem_entregas=True` |

**Permissões DRF** (`usuarios/permissions.py`):
- `IsAdmin` — só ADMIN
- `IsAdminOrOperacional` — Leads, Prospectos, Clientes, OS
- `IsAdminOrFinanceiro` — Financeiro
- `IsAdminOrOperacionalOrFinanceiro` — Email
- `IsAdminOperacionalOrCliente` — Entregas (CLIENTE vê só as próprias)

**Redirecionamento pós-login** (via `redirecionarPosLogin` no `AuthContext`):
- `CLIENTE` com `tem_entregas=True` → `/sistema/entregas`
- `CLIENTE` sem `tem_entregas` → `/sistema/meus-projetos`
- demais perfis → `/sistema/`

**AuthContext:** após login, chama `/api/auth/me/` e armazena `{ id, nome, email, perfil, setor, email_corporativo, tem_entregas }` no estado global.

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
    usuario      = OneToOneField(Usuario, null=True, related_name='cliente_perfil')
    # + telefone, whatsapp, segmento, cidade, estado, cnpj_cpf, origem, observacoes
    tem_entregas = BooleanField(default=False)  # ← acesso ao módulo /entregas/
    ativo        = BooleanField(default=True)
```

### Lead (`vitrine/models.py`)
```python
class Lead(models.Model):
    nome, email, telefone, empresa, mensagem, origem, criado_em
    lido                = BooleanField(default=False)
    observacoes_internas = TextField(blank=True)   # ← preenchido internamente
    convertido          = BooleanField(default=False)  # ← True após converter → Prospecto
```

### Prospecto (`prospectos/models.py`)
```python
class Prospecto(models.Model):
    lead          = ForeignKey('vitrine.Lead', null=True, SET_NULL)
    nome_empresa, nome_contato, email, telefone, whatsapp
    segmento, cidade, estado, cnpj_cpf, origem, observacoes
    responsavel   = ForeignKey('usuarios.Usuario', null=True, SET_NULL)
    convertido    = BooleanField(default=False)   # ← True após → Cliente
    convertido_em = DateTimeField(null=True)
    ativo         = BooleanField(default=True)    # soft delete
```

### Unidade + Entrega (`entregas/models.py`)
```python
class Unidade(models.Model):
    nome      = CharField(max_length=200, unique=True)
    ativo     = BooleanField(default=True)
    criado_em = DateTimeField(auto_now_add=True)
    # ordering: ['nome']

class StatusEntrega(TextChoices):
    PENDENTE | EM_ROTA | ENTREGUE | DEVOLVIDO | CANCELADO

class ConfirmacaoEntrega(TextChoices):
    PENDENTE | CONFIRMADA | NAO_CONFIRMADA

class Entrega(models.Model):
    empresa        = ForeignKey('clientes.Cliente', PROTECT)  # ← campo tenant
    data           = DateField()
    hora           = TimeField(null=True, blank=True)
    solicitante    = CharField(max_length=200, blank=True)     # ← quem solicitou
    unidade        = ForeignKey(Unidade, null=True, PROTECT, related_name='entregas_unidade')
    de             = ForeignKey(Unidade, null=True, PROTECT, related_name='entregas_de')
    para           = ForeignKey(Unidade, null=True, PROTECT, related_name='entregas_para')
    descricao      = TextField(blank=True)
    motoboy        = CharField(max_length=200, blank=True)
    status         = CharField(choices=StatusEntrega, default='PENDENTE')
    observacoes    = TextField(blank=True)
    registrado_por = ForeignKey('usuarios.Usuario', PROTECT, related_name='entregas_registradas')
    confirmacao    = CharField(choices=ConfirmacaoEntrega, default='PENDENTE')
    confirmacao_motivo = TextField(blank=True)   # obrigatório se NAO_CONFIRMADA
    confirmado_por = ForeignKey('usuarios.Usuario', null=True, SET_NULL)
    confirmado_em  = DateTimeField(null=True)
    ativo          = BooleanField(default=True)  # soft delete
    # ordering: ['-data', '-hora']
    # Campos unidade/de/para nullable para compatibilidade com registros antigos (origem/destino)
```

> ⚠️ **Migração histórica:** A VPS tinha 34 registros com `origem`/`destino` (CharField). A migration `0002` adicionou `Unidade`, `solicitante`, `motoboy`, `de`, `para` como nullable e removeu `origem`/`destino`. Registros antigos ficaram com campos novos vazios — preencher manualmente.

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
| Endpoint | Acesso | Descrição |
|----------|--------|-----------|
| `POST token/` | AllowAny | Login JWT |
| `POST token/refresh/` | AllowAny | Renova via cookie httpOnly |
| `POST logout/` | Autenticado | Apaga cookie |
| `GET me/` | Autenticado | Perfil + `tem_entregas` |
| `POST alterar-senha/` | Autenticado | Troca senha (requer senha atual) |
| `POST solicitar-acesso/` | ADMIN | Gera token e envia email de primeiro acesso |
| `POST definir-senha/` | AllowAny | Valida `uid+token`, define senha (link 24h) |
| `GET/POST usuarios/` | ADMIN | CRUD usuários |
| `GET/POST setores/` | ADMIN | CRUD setores |

### Leads (`/api/leads/`)
| Endpoint | Permissão | Descrição |
|----------|-----------|-----------|
| `POST leads/` | AllowAny | Form público da vitrine |
| `GET leads/` | ADMIN, OPERACIONAL | Lista + filtros (data, lido, origem) |
| `PATCH leads/{id}/` | ADMIN, OPERACIONAL | Editar / marcar como lido |
| `POST leads/{id}/converter/` | ADMIN, OPERACIONAL | Cria Prospecto e marca `convertido=True` |

### Prospectos (`/api/prospectos/`)
| Endpoint | Permissão | Descrição |
|----------|-----------|-----------|
| `GET/POST prospectos/` | ADMIN, OPERACIONAL | Lista + criar |
| `PATCH prospectos/{id}/` | ADMIN, OPERACIONAL | Editar |
| `DELETE prospectos/{id}/` | ADMIN | Soft delete |
| `POST prospectos/{id}/converter/` | ADMIN | Cria Cliente e marca `convertido=True` |

### Clientes (`/api/clientes/`)
CRUD completo — ADMIN e OPERACIONAL. Campo `tem_entregas` — editar só via ADMIN no frontend.

| Endpoint | Permissão | Descrição |
|----------|-----------|-----------|
| `POST clientes/{id}/enviar-acesso/` | ADMIN | Cria usuário CLIENTE (se não existir) + envia email de primeiro acesso |

### Entregas (`/api/entregas/` e `/api/unidades/`)
| Endpoint | Permissão | Descrição |
|----------|-----------|-----------|
| `GET/POST unidades/` | ADMIN, OPERACIONAL | Cadastro de unidades |
| `PATCH unidades/{id}/` | ADMIN, OPERACIONAL | Editar unidade |
| `DELETE unidades/{id}/` | ADMIN, OPERACIONAL | Soft delete (ativo=False) |
| `GET entregas/` | ADMIN, OPERACIONAL, CLIENTE | CLIENTE vê só da própria empresa |
| `POST entregas/` | ADMIN, OPERACIONAL | Registra entrega |
| `PATCH entregas/{id}/` | ADMIN, OPERACIONAL | Edita |
| `DELETE entregas/{id}/` | ADMIN | Soft delete |
| `PATCH entregas/{id}/confirmar/` | CLIENTE (própria), ADMIN | Confirma ou recusa |
| `GET entregas/exportar/pdf/` | Todos autenticados | PDF período + empresa |
| `GET entregas/exportar/excel/` | Todos autenticados | Excel período + empresa |

Filtros: `?empresa=`, `?data_inicio=`, `?data_fim=`, `?status=`, `?confirmacao=`
Busca: `?search=` — pesquisa em `solicitante`, `motoboy`, `descricao`
Unidades ativas para combobox: `GET /api/unidades/?ativas=1`

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

### Fluxo de acesso do cliente (sem commitar senha)

```bash
# 1. Na ClientesPage (ADMIN): clicar em "Criar acesso" na linha do cliente
#    → cria Usuario CLIENTE com o email do cliente
#    → vincula ao Cliente
#    → envia email com link /definir-senha/?uid=&token= (válido 24h)
# 2. Cliente clica no link e define a própria senha
# 3. Login normal em /login

# Para reenviar (link expirado): clicar em "Enviar acesso" na ClientesPage

# Email de sistema (vars obrigatórias no .env da VPS):
# SYSTEM_EMAIL_CONTA=contato@uidsoftware.com.br
# SYSTEM_EMAIL_SENHA=<senha Mailcow>
# FRONTEND_URL=https://uidsoftware.com.br
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

## Menu Office — integração com o pipeline

O SystemD tem um menu **Office** (somente ADMIN) que integra o pipeline de desenvolvimento.

```
Office  (logo após Dashboard — somente ADMIN)
├── Escritório      → iframe office.uidsoftware.com.br
├── Board           → Kanban/Scrum (em breve)
├── Agents          → status do time (em breve)
├── Activity Feed   → log de eventos (em breve)
└── Novo Projeto    → fluxo completo de aquisição
    ├── Leads               → LeadsPage (leads do banco)
    ├── Prospectos          → ProspectosPage (lead qualificado)
    ├── Entrevista          → levantamento de requisitos (em breve)
    └── Arquitetura Técnica → form → salva em ordens_arquiteturatecnica
```

**Fluxo de aquisição:** Lead → Prospecto → Entrevista → Arquitetura Técnica → pipeline agents

**Perfis por menu:**
- ADMIN: sem Leads e Prospectos no menu principal — acessam via Office → Novo Projeto
- OPERACIONAL: Leads e Prospectos permanecem no menu principal

### ArquiteturaTecnica (ordens/models.py)

Novo model para o formulário de Arquitetura Técnica do pipeline:
- Campos: projeto, cliente, versao, data_levantamento, responsavel
- Backend stack: linguagem, framework, banco, autenticacao, padrao_api
- Frontend stack: frontend_fw, build_tool, estilizacao, estado_global, server_state
- Infraestrutura: ambiente_deploy, servidor_web, docker, ssl, cicd, pwa, dominio_uid
- Observações: padrao_rotas, perfis_acesso, integracoes, restricoes, notas_claude

Endpoint: GET/POST /api/arquitetura-tecnica/ — permissão: IsAdminOrOperacional
Tabela: ordens_arquiteturatecnica
O Planner lê esta tabela via MCP após o formulário ser salvo.

---

## MCP PostgreSQL — acesso do Planner ao banco

O banco está exposto em 127.0.0.1:5433 para o Planner (Claude Code na VPS).
Configurado em docker-compose.prod.yml (ports: 127.0.0.1:5433:5432) + /root/.claude.json

Verificar: claude mcp list → systemd: ... ✓ Connected

Queries principais do Planner:
```sql
-- Leads novos
SELECT * FROM vitrine_lead WHERE convertido = false ORDER BY criado_em DESC;
-- Arquitetura Técnica mais recente
SELECT * FROM ordens_arquiteturatecnica ORDER BY criado_em DESC LIMIT 1;
-- Criar OS
INSERT INTO ordens_os (cliente_id, titulo, status, ...) VALUES (...);
-- Marcar lead convertido
UPDATE vitrine_lead SET convertido = true WHERE id = X;
```

---

## Infra VPS (`209.50.241.122`)

| Projeto | Porta interna | Domínio |
|---------|--------------|---------|
| nginx-proxy | 80/443 | (roteia todos) |
| Studio Fluir | 8001 | nostudiofluir.com.br |
| **SystemD** | **8002** | uidsoftware.com.br |
| Mailcow HTTP | 8080 | — |
| Mailcow HTTPS | 8443 | mail.uidsoftware.com.br |
| **Office Uid** | **8004** | office.uidsoftware.com.br |
| Novos clientes | 8003+ | — |

- Deploy: `/root/SytemD/`
- SSL: certbot com renovação automática no nginx-proxy
- PostgreSQL MCP: exposto em 127.0.0.1:5433 para o Planner (não público)

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
git pull origin main                                              # ← SEMPRE PRIMEIRO
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
| Fase 8 | Leads + Prospectos + Entregas + Navbar "Entrar" + redirect pós-login | ✅ |
| Fase 8.1 | Acesso do cliente: criar conta + email de primeiro acesso + alterar senha | ✅ |
| Fase 8.2 | Leads: mensagem na tabela + ao vivo (polling 30s) + fix F5 tokenRef | ✅ |
| Fase 9 | Menu Office integrado + MCP PostgreSQL + Novo Projeto (ArquiteturaTecnica) | ✅ |
| Fase 9.1 | Mobile-first em todas as páginas (cards + tabela responsiva) | ✅ |
| Fase 9.2 | Exports PDF/Excel corrigidos + filtro unidade Entregas + confirmação CLIENTE | ✅ |
| Fase 9.3 | Fluxo Novo Projeto: Leads→Prospectos→Entrevista→Arquitetura Técnica | ✅ |
| **Fase 10** | Dashboard real + Pipeline agents via Office | ⏳ |

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

## Agents da Fábrica Uid (UidOffice — VPS)

Os agents estão em `/opt/uid-office/.claude/agents/` na VPS e em `/home/uidsoftware/CODE/UidOffice/.claude/agents/` local.

| Agent | Papel | Quando usar |
|-------|-------|-------------|
| **Planner** | Lead Agent / Gerente de Projeto | Iniciar projeto, orquestrar pipeline, status de sprint |
| **Analista** | Levantamento de requisitos | Elicitar, modelar, documentar requisitos |
| **doc-generator** | Documentação técnica | Gerar 8 documentos padrão após análise |
| **Blueprint** | Arquiteto de software | Definir estrutura técnica, ADRs, plano de fases |
| **Forge** | Dev Backend (Django) | Implementar models, migrations, serializers, viewsets |
| **Loom** | Dev Frontend (React) | Implementar telas, componentes, integração API |
| **Sentinel** | QA / Testes | Validar deploy antes de ir a produção |
| **Pilot** | DevOps / Deploy | Fazer deploy na VPS |
| **Brush** | Design / UX | Identidade visual, componentes |

### Como invocar agents na VPS

```bash
# Carregar credenciais do Office e rodar agent
cd /opt/uid-office && export $(cat .env | xargs) && cd /diretorio-projeto
claude --model claude-sonnet-4-6 -p "Você é o Sentinel — ..."

# O Office usa CLAUDE_CODE_OAUTH_TOKEN (não claude login)
# claude login NÃO funciona em servidor headless (sem browser)
# Sempre exportar as vars do /opt/uid-office/.env antes de rodar
```

### Permissões da VPS (`/root/.claude/settings.json`)

```json
"permissions": {
  "allow": [
    "mcp__systemd__query",
    "mcp__systemd__list_tables",
    "mcp__systemd__describe_table",
    "mcp__systemd__list_schemas",
    "Bash(docker exec*)",
    "Bash(docker ps*)",
    "Bash(docker logs*)"
  ]
}
```

### Primeiro teste da pipeline (19/05/2026)
Pipeline completo testado usando Studio Fluir como caso real:
- **Planner** — recebeu análise de ciclo/PSE, gerou plano com 6 tarefas e briefings para Forge e Loom
- **Forge** — executou B1 (fix ciclo), B2 (endpoint PSE), B3 (migration backfill), B4 (filtro datas)
- **Loom** — executou F1 (simplificação MinistrarAulaPage), F2 (filtro turma RelPressaoPage)
- **Sentinel** — validou deploy na VPS, 5/5 checks passaram, dado real confirmado em produção

Os bonequinhos pixel art do Office ficam visíveis em **SystemD → Office → Escritório** (iframe de office.uidsoftware.com.br). Hooks registram todos os eventos em tempo real.

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Última atualização: 19/05/2026*
