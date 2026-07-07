# CLAUDE.md — Sistema Interno Uid Software (SystemD)

> Ler o CLAUDE.md global (`/opt/claw-empire/CLAUDE.md`) — contém as regras gerais da Uid que se aplicam a todos os projetos.

---

## ⛔ PIPELINE OBRIGATÓRIO — LER ANTES DE QUALQUER AÇÃO

> Esta seção tem prioridade absoluta sobre qualquer outra instrução neste arquivo.

**NUNCA execute tarefas de desenvolvimento diretamente neste projeto.**

```
❌ PROIBIDO usar Edit, Write, MultiEdit para modificar qualquer arquivo de código
❌ PROIBIDO usar Bash para: git add/commit/push, docker compose, npm, pip, manage.py
❌ PROIBIDO implementar qualquer mudança — por menor que pareça
❌ PROIBIDO "é só uma linha", "é trivial", "vou resolver rápido"
   Tamanho da tarefa não muda o protocolo.
```

**Qualquer tarefa recebida (bug, melhoria, correção, feature) segue obrigatoriamente:**

```
1. Invocar hotfix via Agent tool:
   subagent_type: "hotfix"
   prompt: "[descrição exata da tarefa recebida]"

2. Hotfix invoca Planner → Planner invoca Forge/Loom → Sentinel → Pilot

3. Você (Claude raiz) não faz mais nada além de invocar o hotfix.
```

**Sempre usar os bonequinhos** — cada agent DEVE ser invocado via `Agent tool` (não via texto, não via instrução verbal).
Bonequinho no Office = Agent tool foi chamado. Sem Agent tool = sem bonequinho = pipeline quebrado.

**Única exceção:** diagnóstico de leitura (Read, grep, git log, git diff, git status, docker ps, docker logs) para entender o problema antes de passar para o hotfix. Leitura é permitida. Escrita não.

---

## Projeto
Sistema interno da **Uid Software e Tecnologia LTDA**
Fundador: Luiz Eduardo Gonçalves Ferreira
CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional
Sede: Uberlândia/MG | Operação: 100% digital/remota
Contato: (34) 99134-9194 | uidsoftwaretecnologia@gmail.com | www.uidsoftware.com.br

> ⚠️ O nome correto do projeto/repositório é **SystemD** (diretório na VPS: `/root/SystemD`,
> repo: `UidSoftware/SystemD`). Os nomes internos do Docker (containers `sytemd-db-1`,
> `sytemd-backend-1`, `sytemd-nginx-1`, volumes `sytemd_pgdata`, `sytemd_static_volume`,
> `sytemd_frontend_build`, rede `sytemd_default`) continuam com o nome antigo `sytemd`
> de propósito — fixados via `COMPOSE_PROJECT_NAME=sytemd` em `.env`/`.env.prod`.
> **Não remover essa variável nem renomear esses recursos**: o volume `sytemd_pgdata`
> contém o banco de produção (`uid_sistema`) e perderia os dados se o project name mudasse.

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
| `FinanceiroTable` — botões `_acoes` | Nunca usar `flex:1` nem `w-full` nos botões da coluna `_acoes` — o `FinanceiroTable` reutiliza o mesmo render em mobile (cards) e desktop (tabela); com `flex:1`+`w-full` os botões ocupam 100% da célula na tabela desktop. Padrão correto: `{ padding: '5px 10px', borderRadius: 8, ... }` sem `flex`. O componente cuida do layout mobile automaticamente via `mobile-acoes-row` |
| Migrations com permissão root | Migrations geradas por `docker exec ... makemigrations` ficam com owner `root`. Git não consegue criar/sobrescrever esses arquivos no `git pull`. Corrigir antes do pull: `sudo chown -R $USER:$USER backend/<app>/migrations/` |
| `unique=True, null=True, blank=True` — string vazia | Campo com essas três flags aceita `NULL` múltiplo no PostgreSQL, mas `''` (string vazia) viola a constraint única. Serializers com esses campos **obrigatoriamente** precisam de `validate_<field>` convertendo `''` → `None`. Ex: `forn_cnpj` em `FornecedorSerializer`. Sem isso: `POST` com campo vazio → `IntegrityError` → 500. |
| AuthContext — interceptor permanente via `tokenRef` | O interceptor Axios está em `useEffect([])` (roda uma vez) e lê `tokenRef.current`, que é atualizado **síncrono no render** (`tokenRef.current = accessToken`). Nunca mover o interceptor para `useEffect([accessToken])` — effects de filhos rodam antes de pais, causando requests sem token (401) na montagem inicial das páginas. |
| Soft delete financeiro — botão "Desativar" | Nos módulos financeiros (`BaseModel`), o `AuditMixin.perform_destroy` seta `deleted_at` (não `forn_ativo`). Registro some da listagem mas permanece no banco. **Restaurar via shell:** `instance.deleted_at = None; instance.deleted_by = None; instance.save(update_fields=['deleted_at', 'deleted_by'])` |
| Transferência entre contas | `POST /api/financeiro/contas/{id}/transferir/` — cria dois `LivroCaixa` direto (sem model próprio): SAIDA da origem + ENTRADA no destino, ambos com `origem='TRANSFER'` (8 chars, cabe no `max_length=10`). Usa `select_for_update()` + `transaction.atomic()` para saldo seguro. Não passa por `_gerar_lancamento` (sem duplicate guard por `origem_id`). |
| Sidebar — emojis no menu | A `Sidebar.jsx` usa emojis (campo `emoji` em cada item do menu) em vez de SVG icons para itens principais e submenus. O objeto `icons` com SVGs foi mantido mas não é renderizado. Ao adicionar novo item de menu, **sempre incluir `emoji`** no objeto do item. |
| `OrigemLancamento` max_length | Campo `origem` no `LivroCaixa` tem `max_length=10`. Choices atuais: APORTE(6), RECEITA(7), DESPESA(7), MANUAL(6), TRANSFER(8). Nunca adicionar choice com mais de 10 chars sem migration que aumente o max_length. |
| Deploy frontend — 3 comandos obrigatórios | Qualquer alteração no frontend **exige os 3 comandos na sequência**, senão o nginx continua servindo o build antigo e Ctrl+Shift+R não resolve: (1) `docker compose -f docker-compose.prod.yml build --no-cache frontend-builder` → (2) `docker run --rm -v sytemd_frontend_build:/output sytemd-frontend-builder sh -c "cp -r /app/dist/. /output/"` → (3) `docker compose -f docker-compose.prod.yml restart nginx`. **Nunca usar `docker compose run frontend-builder`** — cria o container mas não copia para o volume de forma confiável. |
| `livro-caixa/totais/` e `fluxo-caixa/` — saldo calculado | Nunca usar `ultimo.saldo_atual` como saldo de período. O campo `saldo_atual` em cada `LivroCaixa` é o running balance da conta naquele instante — diverge quando há saldo_inicial ou múltiplas contas. **Fórmula correta:** `livro-caixa/totais/` → `saldo_atual = total_entradas - total_saidas`; `fluxo-caixa/` → `saldo_final = saldo_inicial + total_entradas - total_saidas`. |

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

**Armadilha interna do componente:** o container mobile deve ser `className="md:hidden flex flex-col"` com `style={{ gap: 12 }}`. Nunca adicionar `display: 'flex'` no inline style — teria precedência sobre `md:hidden` e exibiria os cards em cima da tabela desktop em qualquer resolução.

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
│   │                              Menu ADMIN: Office → Novo Projeto (top-level) → Clientes → OS → ...
│   │                              Novo Projeto: Leads → Prospectos → Entrevista → Arq.Técnica → Orçamentos → Contratos
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
│   ├── financeiro/              ← Contas a Receber, Contas a Pagar, Aportes,
│   │                              ContasPage, LivroCaixa (ex-Receitas/Despesas renomeadas)
│   ├── relatorios/              ← ReceitasRelatorioPage, DespesasRelatorioPage
│   │                              (somente leitura — sem botão Novo/Editar/Deletar)
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

### Cliente + SocioCliente (`clientes/models.py`)
```python
class Cliente(models.Model):
    nome_empresa, dominio_email
    usuario      = OneToOneField(Usuario, null=True, related_name='cliente_perfil')
    # + segmento, cidade, estado, cnpj_cpf, origem, observacoes
    tem_entregas = BooleanField(default=False)
    ativo        = BooleanField(default=True)

class SocioCliente(models.Model):
    cliente   = ForeignKey(Cliente, CASCADE, related_name='socios')
    nome, email, telefone, whatsapp, cpf
    principal = BooleanField(default=False)
    # Padrão idêntico ao SocioProspecto
```

### Lead (`vitrine/models.py`)
```python
class Lead(models.Model):
    nome, email, telefone, empresa, mensagem, origem, criado_em
    lido                = BooleanField(default=False)
    observacoes_internas = TextField(blank=True)   # ← preenchido internamente
    convertido          = BooleanField(default=False)  # ← True após converter → Prospecto
```

### Prospecto + SocioProspecto (`prospectos/models.py`)
```python
class Prospecto(models.Model):
    lead         = ForeignKey('vitrine.Lead', null=True, SET_NULL)
    nome_empresa, segmento, cidade, estado, cnpj_cpf, origem, observacoes
    responsavel  = ForeignKey('usuarios.Usuario', null=True, SET_NULL)
    convertido   = BooleanField(default=False)
    convertido_em = DateTimeField(null=True)
    ativo        = BooleanField(default=True)

class SocioProspecto(models.Model):
    prospecto = ForeignKey(Prospecto, CASCADE, related_name='socios')
    nome, email, telefone, whatsapp, cpf
    principal = BooleanField(default=False)   # sócio exibido por padrão
    # Suporta múltiplos sócios. UI: editor inline com + Adicionar sócio
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

### Financeiro (`financeiro/models.py`) — herdam de `BaseFinanceiro`
```python
class BaseFinanceiro(models.Model):  # abstract
    criado_em, atualizado_em, criado_por(FK Usuario), ativo(BooleanField)

class Conta(BaseFinanceiro):     # db_table='fin_conta'
    nome, tipo(CORRENTE/POUPANCA/CAIXA/CARTEIRA), banco, agencia, numero, saldo_inicial

class Aporte(BaseFinanceiro):    # db_table='fin_aporte'
    tipo(CAPITAL_SOCIAL/SOCIO/INVESTIDOR/EMPRESTIMO), descricao, valor
    conta(FK), data, responsavel, observacoes

class Receita(BaseFinanceiro):   # db_table='fin_receita'
    tipo(ENTRADA_CONTRATO/MENSALIDADE/CONSULTORIA/OUTRO)
    status(PENDENTE/RECEBIDO/CANCELADO/ATRASADO)
    descricao, cliente(FK nullable), os(FK nullable)
    categoria(FK Categoria nullable, limit_choices_to tipo=ENTRADA)
    valor_bruto, desconto, valor_liquido (calc em save())
    conta(FK), vencimento, recebimento, referencia_mes, observacoes

class Despesa(BaseFinanceiro):   # db_table='fin_despesa'
    tipo(FIXA/VARIAVEL/PROLABORE/IMPOSTO/OUTRO)
    status(PENDENTE/PAGO/CANCELADO/ATRASADO)
    descricao, fornecedor, valor_bruto, desconto, valor_liquido (calc em save())
    categoria(FK Categoria nullable, limit_choices_to tipo=SAIDA)
    conta(FK), vencimento, pagamento, comprovante(FileField), observacoes
    estornado(bool), data_estorno(DateField nullable), motivo_estorno(TextField)

class Categoria(models.Model):   # db_table='fin_categoria'
    nome, tipo(ENTRADA/SAIDA), ativo, criado_em
    unique_together: [['nome', 'tipo']]
    # Fixture: 4 ENTRADA (Sistema SaaS, Consultoria, Projeto Avulso, Reembolso)
    #          6 SAIDA   (Infraestrutura, Ferramentas, Marketing, Impostos, Pessoal, Outros)

class LivroCaixa(models.Model):  # db_table='fin_livro_caixa' — IMUTÁVEL
    conta(FK), tipo(ENTRADA/SAIDA), origem(APORTE/RECEITA/DESPESA/MANUAL/TRANSFER/ESTORNO)
    origem_id, descricao, valor, data, saldo_anterior, saldo_atual
    criado_em, criado_por, estornado(bool), estorno_de(self FK)
```


### Entrevista (`ordens/models.py`)
```python
class Entrevista(models.Model):
    prospecto        = ForeignKey('prospectos.Prospecto', PROTECT, related_name='entrevistas')
    sistema          = CharField(100)   # nome do sistema a desenvolver
    descricao        = TextField()      # mín. 500 chars
    cores_empresa, dominio, redes_sociais, palavras_chave, publico_alvo, concorrentes
    whatsapp_business = BooleanField(default=False)
    segmento         = CharField(choices=SegmentoEntrevista)
    orcamento_faixa  = CharField(choices=OrcamentoFaixa)  # MEI|PEQUENO|MEDIO
    prazo_desejado   = DateField(null=True)
    ativo            = BooleanField(default=True)
    # UI: tabela + modal (substituiu form avulso)
```

### ArquiteturaTecnica (`ordens/models.py`)
```python
class ArquiteturaTecnica(models.Model):
    entrevista = ForeignKey('ordens.Entrevista', PROTECT, related_name='arquiteturas')
    projeto, cliente, versao, data_levantamento, responsavel
    # Stack BE: linguagem, framework, banco, autenticacao, padrao_api
    # Stack FE: frontend_fw, build_tool, estilizacao, estado_global, server_state
    # Infra:    ambiente_deploy, servidor_web, docker, ssl, cicd, pwa, dominio_uid
    # Obs:      padrao_rotas, perfis_acesso, integracoes, restricoes, notas_claude
    ativo = BooleanField(default=True)  # adicionado em migration 0009
    # Stack padrão Uid: Python/DRF/PostgreSQL/JWT/REST + React18/Vite/Tailwind/Zustand/TanStack
    # Divergências geram alerta visual vermelho no modal
    # UI: tabela + modal
```

### Orcamento + ItemOrcamento (`orcamentos/models.py`)
```python
class Orcamento(models.Model):
    STATUS = rascunho | enviado | aprovado | recusado | expirado | cancelado
    cliente   = ForeignKey('clientes.Cliente', null=True, blank=True, SET_NULL)
    prospecto = ForeignKey('prospectos.Prospecto', null=True, blank=True, SET_NULL)
    # ↑ AMBOS nullable — toggle no modal: "Cliente" ou "Prospecto" (um ou outro)
    numero         = PositiveIntegerField(auto-incremento em save())
    emitido_em     = DateField(auto_now_add)
    valido_ate, status, desconto (Decimal), forma_pagamento, observacoes
    contratid_orcamento_id = IntegerField(null=True)  # ID no ContratID após sync
    contratid_synced_at    = DateTimeField(null=True)
    ativo = BooleanField(default=True)
    # Propriedades: subtotal, total_geral (subtotal - desconto)

class ItemOrcamento(models.Model):
    orcamento      = ForeignKey(Orcamento, CASCADE, related_name='itens')
    ordem, descricao, quantidade (Decimal,3), valor_unitario (Decimal,2)
    # Propriedade: subtotal = quantidade * valor_unitario
```

### ContratID — Integração SSO + Sync (`orcamentos/services.py`)
```
SSO: SystemD gera JWT com sua SECRET_KEY (= SYSTEMD_JWT_KEY do ContratID)
     POST /api/auth/sso/ → recebe access token do ContratID (5min)
Sync automático em todo create/update de Orcamento:
     POST /api/orcamentos/  (novo)  ou  PATCH /api/orcamentos/{id}/  (edição)
     Dados: nome/email/telefone/cpf_cnpj/cidade/estado do cliente OU prospecto
     Salva contratid_orcamento_id e contratid_synced_at no registro SystemD
Sync manual: POST /api/orcamentos/{id}/sincronizar/
```

---

## Endpoints por app


### Orcamentos (`/api/orcamentos/`)
| Endpoint | Permissão | Descrição |
|----------|-----------|----------|
| `GET/POST orcamentos/` | ADMIN, OPERACIONAL | Lista + criar (auto-sync ContratID) |
| `PATCH orcamentos/{id}/` | ADMIN, OPERACIONAL | Editar (re-sync ContratID) |
| `DELETE orcamentos/{id}/` | ADMIN, OPERACIONAL | Soft delete |
| `POST orcamentos/{id}/sincronizar/` | ADMIN | Re-sync manual |
Filtros: `?status=`, `?page=`

### Entrevistas (`/api/entrevistas/`)
| Endpoint | Permissão |
|----------|-----------|
| `GET/POST entrevistas/` | ADMIN, OPERACIONAL |
| `PATCH/DELETE entrevistas/{id}/` | ADMIN, OPERACIONAL (soft delete) |

### Arquitetura Técnica (`/api/arquitetura-tecnica/`)
| Endpoint | Permissão |
|----------|-----------|
| `GET/POST arquitetura-tecnica/` | ADMIN, OPERACIONAL |
| `PATCH/DELETE arquitetura-tecnica/{id}/` | ADMIN, OPERACIONAL (soft delete) |

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
CRUD:
  GET/POST/PATCH/DELETE  contas/           (IsAdminOrFinanceiro)
  GET/POST/PATCH/DELETE  aportes/          (IsAdmin)
  GET/POST/PATCH/DELETE  receitas/         (IsAdminOrFinanceiro)
  GET/POST/PATCH/DELETE  despesas/         (IsAdminOrFinanceiro)
  GET/POST               livro-caixa/      (ReadCreateViewSet — imutável)

Ações:
  POST   receitas/{id}/receber/            → status=RECEBIDO + data + conta + observacao → LivroCaixa ENTRADA
  POST   despesas/{id}/pagar/             → status=PAGO + data + conta + comprovante (opcional) → LivroCaixa SAIDA
  POST   despesas/{id}/estornar/          → valida PAGA+não estornada → LivroCaixa ENTRADA origem=ESTORNO (IsAdmin)
  GET/POST categorias/?tipo=ENTRADA|SAIDA → CRUD categorias (IsAdminOrFinanceiro)
  POST   contas/{id}/transferir/           → 2x LivroCaixa (SAIDA origem + ENTRADA destino), origem='TRANSFER'
  GET    livro-caixa/totais/               → { total_entradas, total_saidas, saldo_atual }
  POST   livro-caixa/{id}/estornar/        → cria lançamento inverso (IsAdmin)

Views calculadas:
  GET  dashboard/                          → KPIs por perfil: fin (receita_mes, despesa_mes, resultado_mes, mrr,
                                             receitas_vencer, despesas_vencer, grafico_6_meses, top_clientes,
                                             receitas_atrasadas, despesas_atrasadas) + ops (pipeline_os, leads_*,
                                             clientes_ativos, ultimas_os, chamados_abertos). Permissão: IsAdminOrOperacionalOrFinanceiro
  GET  fluxo-caixa/?mes=2026-05&conta=1   → saldo_inicial, total_entradas, total_saidas,
                                             saldo_final (= saldo_inicial + entradas - saidas), lancamentos[]
  GET  dre/?ano=2026                       → { ano, meses[12], totais_ano }
  GET  receita-por-cliente/?ano=2026       → lista clientes com totais ordenado por valor
```

Signals automáticos (`financeiro/signals.py`):
- `Aporte` criado → LivroCaixa ENTRADA
- `Receita` status→RECEBIDO → LivroCaixa ENTRADA (via endpoint `/receber/` ou signal direto)
- `Despesa` status→PAGO → LivroCaixa SAIDA (via endpoint `/pagar/` ou signal direto)
- `Despesa` estornada → LivroCaixa ENTRADA origem=ESTORNO (via endpoint `/estornar/`)

Signal OS (`ordens/signals.py`):
- OS status→CONTRATO → cria Receitas (ENTRADA_CONTRATO + 3x MENSALIDADE)
  Usa `_add_months()` customizada — **não usar `python-dateutil`** (não instalado)

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
| `Aporte` criado (post_save) | LivroCaixa ENTRADA origem=APORTE |
| `Receita.status = 'RECEBIDO'` | LivroCaixa ENTRADA origem=RECEITA |
| `Despesa.status = 'PAGO'` | LivroCaixa SAIDA origem=DESPESA |
| `POST /api/financeiro/contas/{id}/transferir/` | Cria 2 lançamentos: SAIDA origem+ENTRADA destino, ambos com `origem='TRANSFER'`. Sem model próprio — direto no LivroCaixa. |
| `OS.status = 'CONTRATO'` | Receitas: ENTRADA_CONTRATO + 3x MENSALIDADE |

Duplicate guard: `_gerar_lancamento` verifica `origem+origem_id` antes de criar — seguro em race condition.

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

- Deploy: `/root/SystemD/`
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

# Produção — rodar na VPS em /root/SystemD/
git pull origin main                                              # ← SEMPRE PRIMEIRO
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker exec sytemd-backend-1 python manage.py migrate

# Deploy frontend (OBRIGATÓRIO após qualquer mudança no frontend)
docker compose -f docker-compose.prod.yml build --no-cache frontend-builder
docker run --rm -v sytemd_frontend_build:/output sytemd-frontend-builder sh -c "cp -r /app/dist/. /output/"
docker compose -f docker-compose.prod.yml restart nginx
```

> ⚠️ **Frontend em produção não tem volume de código** — build estático via `frontend-builder`. Qualquer alteração no frontend exige os 3 comandos acima.

### Fixtures (carregar na VPS após migrate)
```bash
docker exec sytemd-backend-1 python manage.py loaddata setores
docker exec sytemd-backend-1 python manage.py loaddata categorias   # fixture financeiro
```

### Testes

Rodar na VPS (container já tem o .env completo):
```bash
# Todos os apps
docker exec sytemd-backend-1 python manage.py test --verbosity=2

# App específico
docker exec sytemd-backend-1 python manage.py test financeiro.tests --verbosity=2
```

**`docker compose run --rm backend python manage.py test` não funciona no dev local** — o `.env` local não tem `CSRF_TRUSTED_ORIGINS`. Usar sempre o container em execução na VPS.

Cobertura atual — **72 testes, todos passando**:

| App | Testes | O que cobre |
|-----|--------|-------------|
| `vitrine` | 12 | Lead público, gestão, converter, filtros, DELETE 405 |
| `clientes` | 4 | `tem_entregas`, `/api/auth/me/` |
| `entregas` | 10 | CRUD, multi-tenant, confirmação CLIENTE, soft delete |
| `prospectos` | 10 | CRUD, converter → Cliente, permissões |
| `ordens` | 4 | OS, chamados |
| `financeiro` | 32 | Categoria, receber, pagar, estornar, LivroCaixa imutável |

### Corrigir permissões de arquivos criados pelo Docker
```bash
# No dev local (migrations geradas pelo container ficam como root)
sudo chown -R $USER:$USER backend/<app>/migrations/

# Na VPS (caso necessário)
docker run --rm -v /root/SystemD/backend:/app python:3.12-slim chown -R 1000:1000 /app/<diretorio>/
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
| Fase 7 | Financeiro — refatorado para Uid ME: 5 models (Conta/Aporte/Receita/Despesa/LivroCaixa) + signals automáticos + DRE anual + 8 telas frontend | ✅ |
| Fase 8 | Leads + Prospectos + Entregas + Navbar "Entrar" + redirect pós-login | ✅ |
| Fase 8.1 | Acesso do cliente: criar conta + email de primeiro acesso + alterar senha | ✅ |
| Fase 8.2 | Leads: mensagem na tabela + ao vivo (polling 30s) + fix F5 tokenRef | ✅ |
| Fase 9 | Menu Office integrado + MCP PostgreSQL + Novo Projeto (ArquiteturaTecnica) | ✅ |
| Fase 9.1 | Mobile-first em todas as páginas (cards + tabela responsiva) | ✅ |
| Fase 9.2 | Exports PDF/Excel corrigidos + filtro unidade Entregas + confirmação CLIENTE | ✅ |
| Fase 9.3 | Fluxo Novo Projeto: Leads→Prospectos→Entrevista→Arquitetura Técnica | ✅ |
| Fase 9.4 | Sidebar com emojis em todos os itens + submenus; campos faltando em ContasPage (agencia/numero) e DespesasPage (observacoes); botões com emojis em DespesasPage; transferência entre contas com LivroCaixa duplo | ✅ |
| Fase 9.5 | Dashboard profissional: endpoint `/api/financeiro/dashboard/` + DashboardPage reescrito com KPIs por perfil, pipeline OS, gráfico 6 meses (CSS), vencimentos 30d, top clientes; fix saldo em `livro-caixa/totais/` e `fluxo-caixa/`; rename "Fluxo de Caixa" → "Livro Caixa" no menu Relatórios | ✅ |
| Fase 10 | Financeiro: Categoria (fin_categoria + fixture 10 itens), estorno de Despesa, endpoints receber/pagar/estornar/categorias, Sidebar Receitas→Contas a Receber / Despesas→Contas a Pagar, menu Relatórios, páginas relatório somente-leitura; Boss CLI movido para aba no RightSidebar do Office; pipeline hotfix documentado e reforçado; 72 testes automatizados (6 apps) | ✅ |
| **Fase 11** | Pipeline agents — fluxo Lead completo via Office | ⏳ |

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

## Agents da Fábrica Uid (Claw Empire — VPS)

> **UidOffice foi substituído pelo Claw Empire** (`empire.uidsoftware.com.br`). O backup do UidOffice está em `/opt/backups/uid-office-20260605/`.

Os agents estão em `/opt/claw-empire/.claude/agents/` na VPS.

| Agent | Papel | Quando usar |
|-------|-------|-------------|
| **Planner** | Lead Agent / Gerente de Projeto | Iniciar projeto, orquestrar pipeline, status de sprint |
| **Analista** | Levantamento de requisitos | Elicitar, modelar, documentar requisitos |
| **Blueprint** | Arquiteto de software | Definir estrutura técnica, ADRs, plano de fases |
| **Forge** | Dev Backend (Django) | Implementar models, migrations, serializers, viewsets |
| **Loom** | Dev Frontend (React) | Implementar telas, componentes, integração API |
| **Sentinel** | QA / Testes | Validar deploy antes de ir a produção |
| **Pilot** | DevOps / Deploy | Fazer deploy na VPS |
| **Brush** | Design / UX | Identidade visual, componentes |

### Como invocar agents na VPS

```bash
# Carregar credenciais do Office e rodar agent
cd /opt/claw-empire && export $(cat .env | xargs) && cd /diretorio-projeto
claude --model claude-sonnet-4-6 -p "Você é o Sentinel — ..."

# O Claw Empire usa CLAUDE_CODE_OAUTH_TOKEN (não claude login)
# claude login NÃO funciona em servidor headless (sem browser)
# Sempre exportar as vars do /opt/claw-empire/.env antes de rodar
```

### Permissões da VPS (`/root/.claude/settings.json`)

```json
"permissions": {
  "allow": [
    "mcp__systemd__query", "mcp__systemd__list_tables",
    "mcp__systemd__describe_table", "mcp__systemd__list_schemas",
    "Bash(docker exec*)", "Bash(docker ps*)", "Bash(docker logs*)",
    "Read(/var/www/studio-fluir/**)", "Bash(find /var/www*)",
    "Bash(ls /var/www*)", "Bash(wc -l /var/www*)",
    "Bash(grep -n*)", "Bash(grep -r*)"
  ]
}
```

### Como os bonequinhos aparecem no Claw Empire

O Claw Empire (pixel art) mostra personagens trabalhando via hooks `SubagentStart`/`SubagentStop`.
Os bonequinhos aparecem quando o Agent tool é chamado — cada subagente spawnado dispara `SubagentStart` e aciona a animação do personagem correspondente.

O pipeline usa subagentes sequenciais por papel: **Hotfix → Planner → Ursula/Bob → Sentinel → Pilot**.
Cada agent tem seu CLAUDE.md em `/opt/claw-empire/.claude/agents/` que define o papel e instrui a chamar o próximo via Agent tool.

**Regra absoluta do Hotfix** (`/opt/claw-empire/.claude/agents/hotfix.md`):
- Primeira linha: `EXPRESSAMENTE PROIBIDO QUEBRAR O FLUXO DE TRABALHO`
- O Hotfix NÃO analisa, NÃO implementa, NÃO dá instruções de deploy
- Única ação: invocar Planner via Agent tool com `subagent_type: "planner"`

### Boss CLI — layout (29/05/2026)

O Boss CLI foi movido para dentro do painel direito do Office — **não é mais um overlay full-screen**.

**Estrutura do RightSidebar** (histórico — UidOffice substituído pelo Claw Empire):
- 3 abas: **Events** | **Conversation** | **⬡ Boss**
- Clicar no sprite do boss → muda automaticamente para a aba Boss
- Props: `isBossCliActive?: boolean` e `onBossCliClose?: () => void`

**BossCliPanel** (histórico — agora integrado ao Claw Empire):
- Fase form: select de projeto + textarea + botão Enviar (inline, sem modal)
- Fase terminal: xterm.js embutido no sidebar — canvas do jogo permanece visível ao lado
- WebSocket em `wss://{host}/boss` — stream do PTY em tempo real

**BossCliModal** (histórico — agora integrado ao Claw Empire):
- Mantido no repo mas não mais usado em `page.tsx` — substituído pelo BossCliPanel

### Primeiro teste da pipeline (19/05/2026)
Pipeline completo testado usando Studio Fluir como caso real:
- **Planner** — recebeu análise de ciclo/PSE, gerou plano com 6 tarefas e briefings para Forge e Loom
- **Forge** — executou B1 (fix ciclo), B2 (endpoint PSE), B3 (migration backfill), B4 (filtro datas)
- **Loom** — executou F1 (simplificação MinistrarAulaPage), F2 (filtro turma RelPressaoPage)
- **Sentinel** — validou deploy na VPS, 5/5 checks passaram, dado real confirmado em produção

Os bonequinhos pixel art do Office ficam visíveis em **SystemD → Office → Escritório** (iframe de office.uidsoftware.com.br). Hooks registram todos os eventos em tempo real.

---

## Registro de Ciclos

### [2026-05-31] — Hardening do pipeline: correção de PATH no sandbox e fechamento de 19 brechas de delegação nos agents

**Arquivos alterados:**
- `/root/.claude/settings.json` — PATH completo adicionado na seção `env` (resolve docker/git não encontrados no sandbox do Boss CLI)
- `/root/.claude/CLAUDE.md` — criado (global dos globais): regras que se aplicam a todos os projetos + conteúdo migrado do uid-office
- `/root/SystemD/CLAUDE.md` — bloco `⛔ PIPELINE OBRIGATÓRIO` adicionado no topo + referência ao CLAUDE.md global
- `/root/.claude/agents/hotfix.md` — proibição de edição explícita + edge cases cobertos + allowlist Bash
- `/root/.claude/agents/planner.md` — proibições explícitas adicionadas + tratamento de urgência + MCP status flow
- `/root/.claude/agents/sentinel.md` — regra "0 falhas absoluto" reforçada + não edita código + barreira Pilot formalizada
- `/root/.claude/agents/pilot.md` — sem deploy manual + nginx-proxy apenas via commit rastreável + relatório pós-ciclo obrigatório
- `/root/.claude/agents/forge.md` — leitura obrigatória de ADRs antes de implementar + blocklist Bash
- `/root/.claude/agents/loom.md` — fontes obrigatórias em regra explícita + dependência de `design_system.md`
- `/opt/uid-office/.claude/agents/*` — todos os 10 agents sincronizados com as novas regras

**Commits:** nenhum commit de código — todas as alterações são arquivos de configuração Claude (.md e .json), fora do controle de versão do projeto.

**Deploy:** não aplicável — nenhum arquivo de código de produção foi alterado. Sentinel confirmou: alterações restritas a arquivos de configuração, sem necessidade de testes de regressão.

**Sentinel:** APROVADO — alterações são arquivos de configuração (.md), sem código de produção alterado. Nenhum teste de regressão necessário.

---

### [2026-05-31] — Correção: item Relatórios duplicado na sidebar (Fase 10 hotfix)

**Tarefas executadas:**
- Removido item 'Relatórios' duplicado dentro do menuFinanceiro no Sidebar.jsx
- Corrigida ordem de declaração (menuRelatorios antes de menuFinanceiro) para evitar TDZ

**Arquivos alterados:**
- frontend/src/components/sistema/Sidebar.jsx

**Commits:**
- 2e32a4f40aa3 — fix(sidebar): move menuRelatorios antes de menuFinanceiro — corrige TDZ e tela branca

**Deploy:**
- Data: 2026-05-31
- URL: https://uidsoftware.com.br
- Status: ✅ Aprovado por Sentinel
- Observacao: comandos docker nao executaveis dentro do container Office (sem Docker-in-Docker). Executar manualmente no host da VPS:
  ```bash
  docker compose -f /root/SystemD/docker-compose.prod.yml build --no-cache frontend-builder
  docker run --rm -v sytemd_frontend_build:/output sytemd-frontend-builder sh -c "cp -r /app/dist/. /output/"
  docker compose -f /root/SystemD/docker-compose.prod.yml restart nginx
  ```

**Sentinel:**
- Validacao estatica: menuFinanceiro sem item Relatorios, 1 entrada standalone por perfil (ADMIN e FINANCEIRO), sem TDZ
- Resultado: APROVADO

---

### [2026-06-02] — Emoji 💾 no botão Salvar do modal Nova Despesa (Contas a Pagar)

**Tarefas executadas:**
- Adicionado `labelConfirmar="💾 Salvar"` no BotoesModal do modal Nova/Editar Despesa em DespesasPage.jsx
- Modais Pagar e Estorno não foram alterados
- Pipeline completo via Boss CLI: Hotfix → Planner → Loom → Sentinel → Pilot (deploy manual no host)

**Arquivos alterados:**
- `frontend/src/pages/sistema/financeiro/DespesasPage.jsx` (linha 431)

**Commits:**
- `9ee6602` — feat(despesas): adicionar emoji 💾 no botão Salvar do modal Nova Despesa

**Deploy:**
- Data: 2026-06-02
- URL: https://uidsoftware.com.br
- Status: ✅ Em produção

**Sentinel:**
- 5/5 critérios de aceite passando
- Resultado: APROVADO

**Observação — Pilot bloqueado no sandbox:**
O Pilot não consegue executar `git`/`docker` dentro do container Boss CLI (sem Docker-in-Docker e sem git instalado no container). Deploy foi executado manualmente no host. Padrão a seguir até o Pilot ser corrigido:
```bash
cd /root/SystemD
git add <arquivos>
git commit -m "mensagem"
git push origin main
docker compose -f docker-compose.prod.yml build --no-cache frontend-builder
docker run --rm -v sytemd_frontend_build:/output sytemd-frontend-builder sh -c "cp -r /app/dist/. /output/"
docker compose -f docker-compose.prod.yml restart nginx
```

---

### [2026-06-09] — Hotfix: cadastro de Entrevista travava com erro genérico ("Erro ao salvar. Tente novamente.")

**Tarefas executadas:**
- fix(entrevista): remove `validate_descricao` (mínimo de 500 caracteres) do `EntrevistaSerializer`
- fix(entrevista): `EntrevistaPage.jsx` agora exibe a mensagem real de erro de validação do DRF (campo a campo) em vez do genérico "Erro ao salvar. Tente novamente."

**Causa raiz:**
- Backend: `EntrevistaSerializer.validate_descricao` exigia mínimo de 500 caracteres na descrição — mas o campo é um resumo livre do projeto, sem regra de tamanho mínimo ou máximo
- Frontend: o `catch` do submit só lia `err.response?.data?.detail`, mas o DRF retorna erros de campo no formato `{"descricao": ["..."]}` (HTTP 400) — a mensagem real nunca chegava a aparecer, só o fallback genérico
- Sincronização git: 2 deploys anteriores (`8519537`, `9f87aaf`) falharam silenciosamente no CI/CD com "local changes would be overwritten by merge" — working tree da VPS ficou com mudanças não commitadas (mesmos arquivos), bloqueando o `git pull`. Resolvido com `stash` → `pull` → `stash pop` antes deste commit.

**Arquivos alterados:**
- `backend/ordens/serializers.py` — remove `validate_descricao`
- `frontend/src/pages/sistema/office/EntrevistaPage.jsx` — exibe erros de validação por campo retornados pelo DRF

**Commits:**
- `9673d3f` — fix(entrevista): remove validação de tamanho mínimo na descrição e expõe erros de validação no frontend

**Deploy:**
- Data: 2026-06-09 (horário BRT)
- CI/CD GitHub Actions ("Deploy SystemD", run 27249802958) — sucesso
- Status: ✅ Em produção

**Validação:**
- `EntrevistaSerializer` testado via `manage.py shell` no container `backend` em produção: payload com descrição curta (< 500 caracteres) → `VALID: True, ERRORS: {}`

---

## Automação — Disparo do Planner (2026-06-15)

### Como o SystemD se conecta à fábrica

Quando uma **Arquitetura Técnica** é salva sem divergência de stack pendente,
o signal `arquitetura_dispara_planner` cria automaticamente uma notificação
`PRONTO_PARA_PLANNER` no banco (`notificacoes_notificacao`).

Essa notificação é o **gatilho** que conecta o SystemD (CRM/pipeline) ao
Claw Empire (fábrica de software):

```
Arquitetura Técnica salva (sem STACK_FORA_PADRAO pendente)
         ↓
signal arquitetura_dispara_planner
         ↓
notificacoes_notificacao: tipo=PRONTO_PARA_PLANNER, resolvida=false
         ↓
[CRON 4h no host VPS] /opt/uid-automation/disparar_planner.py
         ↓
management command: python manage.py disparar_planner --list
         ↓
Claw Empire API: POST /api/tasks → task para o Planner
         ↓
Planner lê todo o contexto via MCP PostgreSQL e inicia Fluxo 1
```

### Management command: disparar_planner

Localizado em `ordens/management/commands/disparar_planner.py`.

```bash
# Listar arquiteturas prontas para o Planner (JSON)
docker exec sytemd-backend-1 python manage.py disparar_planner --list

# Marcar notificação como resolvida após task criada no Empire
docker exec sytemd-backend-1 python manage.py disparar_planner --mark-done <notificacao_id>
```

### Retomada automática por limite de tokens

O host da VPS tem um watchdog (`retomar_agente.py`) que roda a cada 30 minutos.
Se uma task do Claw Empire ficar `in_progress` sem atividade por 25 minutos
(indicativo de token limit), uma nova task de retomada é criada automaticamente
para o mesmo agente, com instrução para avaliar o estado atual e continuar
de onde parou. Máximo de 5 retomadas por cadeia.

### Regra do timing (4 horas)

O cron dispara o Planner a cada 4 horas — alinhado à renovação do token do Claude Code.
Isso garante que o Planner sempre inicia com 0% de uso, maximizando o budget disponível
para um Fluxo 1 completo.

### Histórico de projetos disparados automaticamente

| Data | Projeto | ArquiteturaTecnica id | Task Empire |
|---|---|---|---|
| 2026-06-15 | ContratId | 1 | `2eb2803e` |


---

*Uid Software e Tecnologia LTDA — Uberlândia/MG*

---

### [2026-06-18] — Cadastro de Manutenção

**Tarefas executadas:**
- Model `Manutencao` — FK para OS, campos `descricao`/`caminho`/`feito`/`ativo`, soft delete
- `ManutencaoSerializer` com `os_titulo` e `os_cliente` read-only
- `ManutencaoViewSet` — CRUD IsAdmin, filtro `?feito=`, soft delete no destroy
- `SistemasParaManutencaoViewSet` — combobox de OSs ativas para o frontend
- Migration `0006_manutencao.py`
- Endpoints: `GET/POST /api/manutencoes/`, `PATCH/DELETE /api/manutencoes/{id}/`, `GET /api/sistemas-para-manutencao/`
- `ManutencaoPage.jsx` — lista + filtros Todos/Pendentes/Concluidos + modal criar/editar
- Combobox de sistemas com auto-preenchimento de caminho (`CAMINHOS_CONHECIDOS`)
- Rota `/sistema/office/manutencoes` (PrivateRoute ADMIN)
- Item "Manutenções" no menu Office da Sidebar
- 5 novos métodos em `services/osApi.js`

**Arquivos alterados:**
- `backend/ordens/migrations/0006_manutencao.py` (novo)
- `backend/ordens/models.py`
- `backend/ordens/serializers.py`
- `backend/ordens/urls.py`
- `backend/ordens/views.py`
- `frontend/src/App.jsx`
- `frontend/src/components/sistema/Sidebar.jsx`
- `frontend/src/pages/sistema/office/ManutencaoPage.jsx` (novo)
- `frontend/src/services/osApi.js`

**Commits:**
- `799316d` — feat(ordens): cadastro de manutencao — model + API + frontend

**Deploy:**
- Data: 2026-06-18
- CI/CD GitHub Actions — merge do branch `climpire/9d265c44` em main + push
- Status: ✅ Em produção

**Sentinel:**
- 0 issues CRITICAL/HIGH
- Resultado: APROVADO


---

### [2026-06-20] — EntrevistaPage no pipeline Novo Projeto

**Tarefas executadas:**
- `EntrevistaPage.jsx` — formulário de 13 campos no pipeline Novo Projeto (Office → Novo Projeto → Entrevista)
- Rota `/sistema/office/novo-projeto/entrevista` (PrivateRoute ADMIN) em App.jsx
- Sidebar.jsx — menuNovoProjeto aponta para nova rota de Entrevista

**Arquivos alterados:**
- `frontend/src/pages/sistema/office/EntrevistaPage.jsx` (novo)
- `frontend/src/App.jsx`
- `frontend/src/components/sistema/Sidebar.jsx`

**Commits:**
- `aae0b11` — feat(office): EntrevistaPage no pipeline Novo Projeto

**Deploy:**
- Data: 2026-06-20
- CI/CD GitHub Actions — push branch climpire/e128e7ee-1 para origin/main (fast-forward)
- URL: https://uidsoftware.com.br
- Status: ✅ Em produção

**Sentinel:**
- Branch limpo (1 commit ahead, 0 behind main), features de produção preservadas
- Resultado: APROVADO

---

---

### [2026-06-27/29] — Conciliação Bancária via Dropbox + Watchdog

**Contexto:**
8 transações de junho do C6 foram registradas manualmente e conciliadas com as respectivas contas a pagar existentes. Saldo SystemD R$37,66 = Banco R$37,66 ✓

**Módulo implementado:**
- `backend/financeiro/models.py` — model `ConciliacaoExtrato` (extrato vs LC)
- `backend/financeiro/parsers.py` — parser de PDF do C6/BTG via `pdfplumber`
- `backend/financeiro/management/commands/conciliar_extrato.py` — management command
- `backend/financeiro/views.py` + `urls.py` — endpoints de conciliação
- `backend/financeiro/migrations/0007_...` — migration
- `watchdog_conciliacao.py` (raiz do projeto, roda no host VPS) — detecta PDFs novos ou modificados e dispara o command automaticamente

**Como o watchdog funciona:**
```
Usuário salva/sobrescreve PDF na pasta do Dropbox
        ↓
watchdog (host VPS, processo nohup) verifica a cada 24h
        ↓
Compara {caminho: mtime} — detecta arquivo novo OU mtime modificado
        ↓
docker exec sytemd-backend-1 python manage.py conciliar_extrato --arquivo <pdf> --conta <C6|BTG>
        ↓
Resultado disponível na página de conciliação do sistema
```

**Pasta monitorada:**
```
/home/notuidsoftware/Dropbox/01 - Contabilidade/Extratos Onvio/Extratos
```

**Inferência de conta pelo nome do arquivo:**
- Nome contém `C6` → conta C6
- Nome contém `BTG` → conta BTG

**Como reiniciar o watchdog:**
```bash
kill $(ps aux | grep watchdog_conciliacao | grep -v grep | awk '{print $2}')
nohup python3 /root/SystemD/watchdog_conciliacao.py >> /var/log/watchdog_conciliacao.log 2>&1 &
tail -f /var/log/watchdog_conciliacao.log
```

**Intervalo:** 24h (sistema pequeno — ajustar se volume de extratos crescer)

**Dependência:** Dropbox instalado no host VPS sincronizando a pasta acima.

**Commits desta sessão:**
- `4475ae9` — fix: watchdog detecta modificacao de extrato por mtime
- `aae737f` — config: watchdog intervalo 5min -> 24h

---

### [2026-07-05/07] — Correções em Orçamentos + novo módulo Artefatos (Office)

**Contexto:**
Sessão iniciada com bugs reportados no módulo de Orçamentos (tela branca ao criar,
"campo obrigatório" ao salvar, falso alerta de falha de sincronização com o
ContratID). Evoluiu para a criação de um módulo inteiro: registro formal dos
artefatos produzidos pelos 11 agents do Claw Empire (Planner, Analista,
AnalistaUML-skill, Blueprint, Brush, Doc Generator, Forge, Loom, Sentinel, Pilot,
Hotfix), já que o SystemD nasceu depois desse pipeline existir e nunca teve onde
registrar o que cada agent entrega.

**Bugs corrigidos em Orçamentos:**
- `OrcamentosPage.jsx` usava `modalConfirmar`/`ModalConfirmar` sem declarar o
  estado nem importar o componente em 3 telas (Orçamentos, Contas a Receber,
  Fornecedores) — `ReferenceError` no render causava tela branca. Padrão a
  conferir em qualquer tela nova que reaproveite `ModalConfirmar`.
- `OrcamentoSerializer.criado_por` não era `read_only` — como quem preenche é a
  view (`perform_create`), a validação sempre falhava com "campo obrigatório"
  antes de chegar lá.
- `sync_to_contratid()` atualizava o banco via `.filter().update()`, que não
  reflete no objeto Python devolvido pela view — o frontend sempre recebia
  `contratid_synced: false` mesmo quando o sync tinha dado certo.
- `emitido_em` era `auto_now_add` (sempre = data de criação); virou campo
  editável com default hoje, igual `valido_ate`. Mesma mudança replicada no
  ContratID (`backend/apps/orcamentos`).

**Módulo Artefatos (novo):**
- `backend/artefatos/` — model `Artefato` com `GenericForeignKey` (vincula a
  Lead, Prospecto, Entrevista, ArquiteturaTecnica, OS ou Manutencao), 17 tipos
  (levantamento_requisitos, uml_usecase/classes/activity/sequencia/estado/
  componentes/implantacao, dicionario_dados, regras_negocio, design_system, adr,
  contrato_servico, especificacao_hotfix, especificacao_ui_hotfix, relatorio_qa,
  deploy_info, outro) e 11 agentes em choices.
- Autenticação dupla no endpoint `/api/artefatos/`: JWT normal (tela) OU token de
  serviço fixo via `ARTEFATOS_API_TOKEN` (agents rodando via Bash na VPS) —
  `authentication_classes` precisa do `ServiceTokenAuthentication` **antes** do
  `JWTAuthentication`, senão o JWT rejeita o token e nunca cai no fallback.
- `frontend/.../office/ArtefatosPage.jsx` — lista com filtro por tipo/agente/
  busca, viewer lateral com conteúdo em markdown, botão roxo "📊 Diagrama" que
  abre modal dedicado quando o conteúdo tem bloco ` ```mermaid ` (lib `mermaid`
  adicionada às dependências). O viewer lateral **não** tenta renderizar o
  diagrama inline (fica cortado) — só o texto; o diagrama só aparece no modal.
- **Instrumentação dos agents na VPS** (`/root/.claude/agents/*.md`, 10 dos 11
  arquivos — `analistaUML.md` é skill de referência sem artefato próprio): cada
  um ganhou um passo "Registro de Artefato" antes da passagem de bastão, com
  `curl -X POST "$ARTEFATOS_API_URL"` usando `$ARTEFATOS_API_TOKEN` (ambos
  configurados no `env` de `/root/.claude/settings.json`). Falha na chamada
  nunca bloqueia a entrega real do agent — é sempre best-effort.
- **Documentação retroativa do próprio SystemD**: como o sistema nunca passou
  pelo pipeline formal, foram gerados e registrados manualmente (via curl) os
  6 artefatos que ele teria produzido: Levantamento de Requisitos, UML Casos de
  Uso, UML Classes, Dicionário de Dados, Regras de Negócio e ADR — todos
  consultáveis em Office > Artefatos.

**Armadilha encontrada:** o service worker antigo (PWA) pode servir uma versão
cacheada da tela mesmo com deploy novo confirmado no bundle — sempre que uma
tela "não atualizar" após deploy confirmado, testar `/clear-sw` antes de
investigar outra causa.

**Commits desta sessão (SystemD):**
- `09023e7` `074ba01` `065bdca` — fixes em Orçamentos (tela branca, criado_por, sync ContratID)
- `1f0fa78` — emitido_em editável
- `eb9ac52` — fix ModalConfirmar em Contas a Receber/Fornecedores
- `7795581` `ce8c796` `5975878` `3009215` — módulo Artefatos (backend + tela + tipos)
- `d33264c` `d2dd290` `c3326d4` — renderização Mermaid + botão Diagrama + limpeza do preview

**Deploy:** todos os commits via push em `main` → CI/CD GitHub Actions, confirmado em produção (`uidsoftware.com.br`) a cada etapa.

---

*Última atualização: 2026-07-07 (módulo Artefatos + correções em Orçamentos)*
