# Instrucao_Claude_Code_Modulo_Leads_Clientes.md
# Sistema: Uid Software — SystemD
# Módulo: Leads + Campo Entregas no Cliente
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.
> 🚨 Produção direta. Sem placeholder. Sem MVP. Entrega completa.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. O model `Cliente` já existe em `clientes/`
3. O model `Lead` já existe em `vitrine/` (dados do formulário público)
4. Só então escrever código

---

## Escopo

| # | Entrega |
|---|---------|
| 1 | Campo `tem_entregas` no model Cliente |
| 2 | Redirecionamento pós-login baseado no perfil + flag |
| 3 | Tela de Leads — listagem + filtros + edição |
| 4 | Converter Lead em Prospecto |
| 5 | Model Prospecto (campos iguais ao Cliente, sem `tem_entregas`) |
| 6 | API e tela de Prospectos |
| 7 | Sidebar atualizada |

---

## PARTE 1 — Campo `tem_entregas` no Cliente

### Migration

```python
# Adicionar ao model Cliente (clientes/models.py)
tem_entregas = BooleanField(default=False)
# False = cliente comum, True = acessa módulo /entregas/
```

### Lógica de redirecionamento pós-login

```python
# No endpoint /api/auth/me/ — adicionar campo tem_entregas

# Retorno:
{
  "id": 1,
  "nome": "...",
  "perfil": "CLIENTE",
  "setor": {...},
  "tem_entregas": True   # ← novo campo
}
```

### Frontend — AuthContext.jsx

```jsx
// Após login, checar perfil + tem_entregas
const redirecionarPosLogin = (usuario) => {
  if (usuario.perfil === 'CLIENTE' && usuario.tem_entregas) {
    navigate('/sistema/entregas')
  } else if (usuario.perfil === 'CLIENTE') {
    navigate('/sistema/meus-projetos')
  } else {
    navigate('/sistema/')  // ADMIN, OPERACIONAL, FINANCEIRO
  }
}
```

### Tela de Clientes — adicionar campo

No modal de cadastro/edição do Cliente, adicionar:
- **Toggle "Acesso ao módulo de Entregas"** — `tem_entregas`
- Visível apenas para ADMIN
- Quando ativado: o cliente logado é redirecionado para `/sistema/entregas/` após login

---

## PARTE 2 — Tela de Leads

O model `Lead` já existe em `vitrine/`. Falta apenas a tela de gestão interna.

### Campos do Lead (existentes)

```python
# vitrine/models.py — já existe
id, nome, email, telefone, empresa, mensagem, origem, criado_em, lido
```

### API — Endpoints

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/leads/` | ADMIN, OPERACIONAL | Lista leads |
| GET | `/api/leads/{id}/` | ADMIN, OPERACIONAL | Detalhe do lead |
| PATCH | `/api/leads/{id}/` | ADMIN, OPERACIONAL | Editar / marcar como lido |
| DELETE | `/api/leads/{id}/` | ADMIN | Soft delete |
| POST | `/api/leads/{id}/converter/` | ADMIN, OPERACIONAL | Converte em Prospecto |

### Tela de Leads (`/sistema/leads`)

**Header:**
- Título "Leads"
- Badge com total de leads não lidos — `"X não lidos"`

**Filtros:**
- Data início + Data fim
- Lido / Não lido (select)
- Origem (text)
- Botão "Filtrar" + "Limpar"

**Tabela:**
- Colunas: Data | Nome | Empresa | Email | Telefone | Origem | Lido | Ações
- Linha não lida: destaque visual (fundo levemente diferente)
- Badge "Novo" nas linhas não lidas
- Ao clicar na linha → abre detalhe/edição
- Ações: "Ver" | "Converter em Prospecto" | "Excluir"
- Paginação — sempre `response.data.results`

**Modal de detalhe/edição:**
- Todos os campos do Lead em modo leitura + edição
- Toggle "Marcar como lido"
- Botão "Converter em Prospecto" → abre modal de conversão
- Campo "Observações internas" (não era do form público — adicionar ao Lead)

**Modal de conversão para Prospecto:**
- Preenche automaticamente com dados do Lead
- Campos editáveis antes de salvar
- Ao confirmar → cria Prospecto + marca Lead como `convertido=True`

---

## PARTE 3 — Model Prospecto

Prospecto = lead qualificado que virou oportunidade real, mas ainda não assinou contrato.

```python
# prospectos/models.py

class Prospecto(models.Model):
    # origem
    lead            = ForeignKey(
                        'vitrine.Lead',
                        null=True, blank=True,
                        on_delete=SET_NULL,
                        related_name='prospectos'
                      )  # vínculo com o lead de origem (se veio de um)

    # dados da empresa (iguais ao Cliente — sem tem_entregas)
    nome_empresa    = CharField(max_length=150)
    nome_contato    = CharField(max_length=150)
    email           = EmailField()
    telefone        = CharField(max_length=20, blank=True)
    whatsapp        = CharField(max_length=20, blank=True)
    segmento        = CharField(max_length=50, blank=True)
    cidade          = CharField(max_length=100, blank=True)
    estado          = CharField(max_length=2, blank=True)
    cnpj_cpf        = CharField(max_length=20, blank=True)
    origem          = CharField(max_length=50, blank=True)
    observacoes     = TextField(blank=True)

    # controle interno
    responsavel     = ForeignKey(
                        'usuarios.Usuario',
                        null=True, blank=True,
                        on_delete=SET_NULL
                      )
    convertido      = BooleanField(default=False)  # True = virou Cliente
    convertido_em   = DateTimeField(null=True, blank=True)
    ativo           = BooleanField(default=True)
    criado_em       = DateTimeField(auto_now_add=True)
    atualizado_em   = DateTimeField(auto_now=True)
```

> ⚠️ Prospecto **não tem** `tem_entregas` — isso só existe no Cliente.
> Quando Prospecto vira Cliente, ADMIN define manualmente se tem acesso a entregas.

### Fluxo completo

```
Lead (form público)
    ↓ converter
Prospecto (qualificado, reunião marcada)
    ↓ abrir OS
Cliente (contrato assinado, sistema no ar)
```

---

## API — Prospectos

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/prospectos/` | ADMIN, OPERACIONAL | Lista prospectos |
| POST | `/api/prospectos/` | ADMIN, OPERACIONAL | Cria prospecto manual |
| GET | `/api/prospectos/{id}/` | ADMIN, OPERACIONAL | Detalhe |
| PATCH | `/api/prospectos/{id}/` | ADMIN, OPERACIONAL | Edita |
| DELETE | `/api/prospectos/{id}/` | ADMIN | Soft delete |
| POST | `/api/prospectos/{id}/converter/` | ADMIN | Converte em Cliente |

### Endpoint converter Prospecto → Cliente

```python
# POST /api/prospectos/{id}/converter/
# Cria um Cliente com os dados do Prospecto
# Marca prospecto.convertido = True, prospecto.convertido_em = now()
# Retorna o Cliente criado
```

---

## Tela de Prospectos (`/sistema/prospectos`)

**Header:**
- Título "Prospectos"
- Botão "Novo prospecto"

**Filtros:**
- Segmento | Cidade | Responsável | Convertido (sim/não)

**Tabela:**
- Colunas: Nome empresa | Contato | Email | Segmento | Cidade | Responsável | Origem | Ações
- Badge "Convertido" em verde nas linhas já viradas em Cliente
- Ações: "Ver/Editar" | "Converter em Cliente" | "Abrir OS" | "Excluir"
- Paginação — sempre `response.data.results`

**Modal de cadastro/edição:**
- Todos os campos do Prospecto
- Select de Responsável (usuários ADMIN/OPERACIONAL)
- Botão "Converter em Cliente" (só ADMIN)

---

## Adendo — campo `observacoes_internas` no Lead

```python
# Adicionar ao model Lead (vitrine/models.py)
observacoes_internas = TextField(blank=True)
# Preenchido internamente pela equipe Uid — não aparece no form público
convertido           = BooleanField(default=False)
# True quando o lead foi convertido em Prospecto
```

---

## Sidebar — atualizar

```javascript
// Adicionar em ADMIN e OPERACIONAL:
{ label: 'Leads',       icon: '📥', path: '/sistema/leads' }
{ label: 'Prospectos',  icon: '🎯', path: '/sistema/prospectos' }
```

Ordem sugerida na sidebar:
```
Dashboard
Leads          ← novo
Prospectos     ← novo
Clientes
OS
Financeiro
Entregas
Email
Usuários
Configurações
```

---

## Estrutura de arquivos

```
backend/
├── vitrine/
│   └── models.py      ← adicionar observacoes_internas + convertido ao Lead
├── prospectos/        ← CRIAR app novo
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── clientes/
│   └── models.py      ← adicionar tem_entregas

frontend/
├── src/pages/sistema/
│   ├── LeadsPage.jsx        ← CRIAR
│   └── ProspectosPage.jsx   ← CRIAR
```

---

## Ordem de execução

```
ETAPA 1 — Backend: Migrations
  → Adicionar tem_entregas ao Cliente
  → Adicionar observacoes_internas + convertido ao Lead
  → Criar app prospectos/ com model Prospecto
  → Confirmar: make migrate sem erro ✅

ETAPA 2 — Backend: API Leads
  → Adicionar endpoints de listagem + edição + converter
  → Endpoint /api/leads/{id}/converter/ cria Prospecto
  → Atualizar /api/auth/me/ com tem_entregas
  → Confirmar: conversão cria Prospecto e marca lead.convertido=True ✅

ETAPA 3 — Backend: API Prospectos
  → CRUD completo + endpoint /converter/ → Cliente
  → Confirmar: Prospecto vira Cliente com dados corretos ✅

ETAPA 4 — Frontend: Redirecionamento pós-login
  → Atualizar AuthContext com lógica de redirecionamento
  → Confirmar: CLIENTE com tem_entregas vai pra /entregas/ ✅
  → Confirmar: CLIENTE sem tem_entregas vai pra /meus-projetos/ ✅

ETAPA 5 — Frontend: LeadsPage
  → Listagem + filtros + badge não lidos
  → Modal de detalhe/edição
  → Modal de conversão para Prospecto
  → Confirmar: fluxo completo Lead → Prospecto ✅

ETAPA 6 — Frontend: ProspectosPage
  → Listagem + filtros
  → Modal de cadastro/edição
  → Botão converter em Cliente
  → Confirmar: fluxo completo Prospecto → Cliente ✅

ETAPA 7 — Frontend: Tela de Clientes
  → Adicionar toggle tem_entregas no modal de edição
  → Confirmar: toggle visível só pra ADMIN ✅

ETAPA 8 — Sidebar
  → Adicionar Leads e Prospectos na ordem correta
  → Confirmar: visível pra ADMIN e OPERACIONAL ✅

ETAPA 9 — Testes e produção
  → Testar fluxo completo: Lead → Prospecto → Cliente
  → Testar redirecionamento pós-login dos dois tipos de CLIENTE
  → make test passando
  → Deploy produção
  → Atualizar CLAUDE.md ✅
```

---

## O que NÃO fazer

- ❌ Deletar Lead — sempre soft delete
- ❌ Prospecto com campo `tem_entregas` — só Cliente tem
- ❌ Converter Prospecto em Cliente sem ser ADMIN
- ❌ `response.data` direto — sempre `response.data.results`
- ❌ Redirecionamento hardcoded — sempre baseado no perfil + tem_entregas do /api/auth/me/

---

## Checklist de conclusão

- [ ] `tem_entregas` adicionado ao Cliente
- [ ] `observacoes_internas` + `convertido` adicionados ao Lead
- [ ] App `prospectos/` criado com model completo
- [ ] Migrations aplicadas
- [ ] API Leads com listagem + edição + converter
- [ ] API Prospectos com CRUD + converter em Cliente
- [ ] `/api/auth/me/` retornando `tem_entregas`
- [ ] Redirecionamento pós-login funcionando (2 tipos de CLIENTE)
- [ ] LeadsPage com badge de não lidos + conversão
- [ ] ProspectosPage com conversão em Cliente
- [ ] Toggle `tem_entregas` na tela de Clientes (só ADMIN)
- [ ] Sidebar atualizada com Leads e Prospectos
- [ ] Fluxo Lead → Prospecto → Cliente testado
- [ ] make test passando
- [ ] CLAUDE.md atualizado

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Gerado em: 19/04/2026*
