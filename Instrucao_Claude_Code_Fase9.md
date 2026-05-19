# Instrucao_Claude_Code_Fase9.md
# Sistema: Uid Software — SystemD
# Fase 9 — Office, MCP, Pipeline Agents e Mobile First
> Uid Software | Versão: 1.0 | Etapa: Concluída
> Última atualização: 19/05/2026
> ℹ️ Esta fase foi executada incrementalmente. Documento criado para registro.

---

## O que foi construído

### 9.0 — Menu Office integrado ao SystemD

**O SystemD ganhou um menu Office exclusivo para ADMIN:**

```
🏢 Office
├── Escritório      → iframe de office.uidsoftware.com.br
├── Board           → Kanban/Scrum (em breve)
├── Agents          → status do time (em breve)
├── Activity Feed   → log de eventos (em breve)
└── Novo Projeto
    ├── Leads       → LeadsPage (/sistema/leads)
    ├── Entrevista  → roteiro de levantamento (em breve)
    └── Arquitetura Técnica → form completo → banco → Planner via MCP
```

**Impacto no menu lateral:**
- ADMIN: Leads removido do menu principal — acessa via Office → Novo Projeto → Leads
- OPERACIONAL: Leads permanece no menu principal

---

### 9.1 — Model ArquiteturaTecnica

**App:** `ordens/models.py`
**Tabela:** `ordens_arquiteturatecnica`
**Endpoint:** `GET/POST /api/arquitetura-tecnica/` — permissão: `IsAdminOrOperacional`

```python
class ArquiteturaTecnica(models.Model):
    os            = OneToOneField(OS, null=True, blank=True, on_delete=CASCADE, related_name='arquitetura')
    lead          = ForeignKey('vitrine.Lead', null=True, blank=True, on_delete=SET_NULL)
    projeto       = CharField(max_length=200)
    cliente       = CharField(max_length=150)
    versao        = CharField(max_length=20, default='1.0.0')
    data_levantamento = DateField(null=True, blank=True)
    responsavel   = CharField(max_length=150, blank=True)
    # Backend
    linguagem, framework, banco, autenticacao, padrao_api
    # Frontend
    frontend_fw, build_tool, estilizacao, estado_global, server_state
    # Infraestrutura
    ambiente_deploy, servidor_web
    docker, ssl, cicd, pwa, dominio_uid  # BooleanField
    # Rotas e observações
    padrao_rotas, perfis_acesso, integracoes, restricoes, notas_claude
    criado_em, atualizado_em
```

**Fluxo completo:**
```
SystemD → Office → Novo Projeto → Arquitetura Técnica
    ↓ POST /api/arquitetura-tecnica/
Salva em ordens_arquiteturatecnica
    ↓ Planner lê via MCP
SELECT * FROM ordens_arquiteturatecnica ORDER BY criado_em DESC LIMIT 1;
    ↓ Pipeline roda
Analista → doc-generator → Blueprint → Forge/Loom → Sentinel → Pilot
```

---

### 9.2 — MCP PostgreSQL (Planner → SystemD)

O banco do SystemD foi exposto em `127.0.0.1:5433` para o Planner acessar via MCP.

**Configuração aplicada:**
```yaml
# docker-compose.prod.yml — serviço db
ports:
  - "127.0.0.1:5433:5432"
```

```bash
# Registrado via:
claude mcp add systemd -s user -- npx -y @modelcontextprotocol/server-postgres \
  'postgresql://uid_user:***@127.0.0.1:5433/uid_sistema'
```

**Verificação:**
```bash
claude mcp list
# systemd: ... ✓ Connected
```

**Permissões no `/root/.claude/settings.json`:**
```json
"allow": ["mcp__systemd__query", "mcp__systemd__list_tables",
          "mcp__systemd__describe_table", "mcp__systemd__list_schemas"]
```

**Queries principais do Planner:**
```sql
-- Leads novos
SELECT * FROM vitrine_lead WHERE convertido = false ORDER BY criado_em DESC;

-- Arquitetura Técnica mais recente
SELECT * FROM ordens_arquiteturatecnica ORDER BY criado_em DESC LIMIT 1;

-- Criar OS
INSERT INTO ordens_os (cliente_id, titulo, status, criado_em, atualizado_em)
VALUES (..., 'LEAD', NOW(), NOW());

-- Marcar lead como convertido
UPDATE vitrine_lead SET convertido = true WHERE id = X;
```

---

### 9.3 — Correções Entregas

| Item | Problema | Solução |
|---|---|---|
| Export PDF | `e.origem` / `e.destino` não existem | → `e.de.nome`, `e.para.nome`, `e.unidade.nome` |
| Export Excel | Mesmos campos inexistentes | Mesma correção |
| Confirmação CLIENTE | Botão na última coluna — cortado no mobile | Coluna Confirmação movida para primeira |
| Filtro | Sem filtro por unidade | Adicionado select de unidade no filtro backend + frontend |

**Backend fix (`entregas/views.py`):**
```python
unidade_id = self.request.query_params.get('unidade')
if unidade_id:
    from django.db.models import Q
    qs = qs.filter(Q(unidade_id=unidade_id) | Q(de_id=unidade_id) | Q(para_id=unidade_id))
```

---

### 9.4 — Mobile First em todas as telas

**Padrão aplicado:**
```jsx
{/* Mobile — cards */}
<div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
  {items.map(item => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        <div>
          <span style={{ color: '#6b6b8a', fontSize: 11 }}>Label</span>
          <br/>
          <span style={{ color: '#e2d9f3', fontSize: 13 }}>Valor</span>
        </div>
      </div>
      {/* Botões full-width no mobile */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={{ flex: 1, padding: '8px 0', borderRadius: 8 }}>Ação</button>
      </div>
    </div>
  ))}
</div>

{/* Desktop — tabela */}
<div className="hidden md:block">
  <table>...</table>
</div>
```

**Páginas convertidas:**

| Página | Cards mobile | Observação |
|---|---|---|
| ClientesPage | ✅ | nome, segmento, contato, tel clicável, email |
| EntregasPage | ✅ | confirmação no topo para CLIENTE, rota, status |
| LeadsPage | ✅ | data, nome, empresa, mensagem snippet, status |
| ProspectosPage | ✅ | empresa, contato, segmento, cidade, ações |
| OSPage | ✅ | título, cliente, status, valor, data entrega |
| UsuariosPage | ✅ | nome, email, perfil, setor, ações |
| SetoresPage | ✅ | nome, descrição, status |
| UnidadesPage | ✅ | nome, status |
| MinhasFaturasPage | ✅ | projeto, valores, status |
| FinanceiroTable.jsx | ✅ | componente compartilhado — 8 telas herdam |
| MeusProjetosPage | — | já era mobile-first (accordion) |
| SuportePage | — | já era mobile-first (accordion) |

---

## O que NÃO fazer

- ❌ Remover ou alterar o `FinanceiroTable.jsx` sem testar as 8 telas financeiras
- ❌ Usar `FloatField` em qualquer campo monetário — sempre `DecimalField`
- ❌ Acessar `e.origem` / `e.destino` na Entrega — campos não existem, usar `e.de`, `e.para`, `e.unidade`
- ❌ Expor a porta 5433 publicamente — apenas `127.0.0.1:5433`
- ❌ Commitar o token MCP ou senha do banco
- ❌ Alterar `overflow-hidden` no `SistemaLayout` root

---

## Comandos de deploy desta fase

```bash
# Rebuild backend (mudanças Python)
cd /root/SytemD && docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker exec sytemd-backend-1 python manage.py makemigrations ordens
docker exec sytemd-backend-1 python manage.py migrate

# Rebuild frontend (mudanças React)
docker compose -f docker-compose.prod.yml build --no-cache frontend-builder
docker compose -f docker-compose.prod.yml up -d frontend-builder
docker exec sytemd-nginx-1 nginx -s reload
```

---

## Checklist de conclusão

- [x] Menu Office no SystemD com 5 itens (Escritório, Board, Agents, Activity Feed, Novo Projeto)
- [x] Sub-submenu Novo Projeto (Leads, Entrevista, Arquitetura Técnica)
- [x] Model ArquiteturaTecnica + API `/api/arquitetura-tecnica/`
- [x] Form React completo salvando no banco
- [x] Migration `ordens.0002_arquiteturatecnica` aplicada
- [x] Porta 5433 exposta no docker-compose do SystemD
- [x] MCP PostgreSQL configurado no `/root/.claude.json`
- [x] Permissões MCP no `/root/.claude/settings.json`
- [x] Export PDF corrigido (de/para/unidade)
- [x] Export Excel corrigido
- [x] Filtro por unidade no backend e frontend
- [x] Confirmação movida para 1ª coluna na view CLIENTE
- [x] Mobile-first: 8 páginas principais + FinanceiroTable.jsx
- [x] CLAUDE.md atualizado
- [x] Commit e push realizados

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1–8.2 | Setup, Vitrine, Auth, Webmail, OS, Financeiro, Entregas | ✅ |
| **Fase 9** | Office + MCP + ArquiteturaTecnica + Mobile First | ✅ |
| Fase 10 | Dashboard real + Pipeline agents via Office | ⏳ |

---

**🐷 Fase 9 concluída. Fábrica rodando. A porca vai torcer o rabo!**

> Office no ar: https://office.uidsoftware.com.br
> SystemD: https://uidsoftware.com.br/sistema

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG | 19/05/2026*
