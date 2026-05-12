# Instrucao_Claude_Code_Fase5.md
# Sistema: Uid Software — SystemD
# Fase 5 — Perfis + Setores + Email vinculado
> Uid Software | Versão: 2.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.
> 🚨 Produção direta. Sem placeholder. Sem "Em breve". Sem MVP. Entrega completa.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. Confirme que Fases 1–4 estão concluídas (`make test` passando)
3. **Fazer backup do banco antes de rodar migrations desta fase**
4. Só então escrever código

---

## Contexto

O `Usuario` atual autentica por email e tem vínculo com `UsuarioEmailConfig` (Mailcow). Funciona, mas qualquer usuário logado vê tudo. Isso precisa acabar.

Esta fase entrega o sistema completo de usuários, permissões e setores — funcionando em produção, sem gambiarras.

**Perfil** → define *o que* o usuário pode fazer
**Setor** → define *em qual contexto* ele atua
**Juntos** → determinam menu, rotas e permissões reais

---

## Escopo — tudo entra, tudo funciona

| # | Entrega |
|---|---------|
| 1 | Model Setor com CRUD completo |
| 2 | Refatoração segura do Usuario (perfil + setor) |
| 3 | Permissions DRF por perfil aplicadas em todos os ViewSets |
| 4 | Sidebar 100% dinâmica por perfil |
| 5 | Rotas protegidas por perfil no frontend |
| 6 | Portal do Cliente completo (OS + Suporte + Faturas) |
| 7 | Tela de Usuários completa (CRUD + badges) |
| 8 | Tela de Setores completa |
| 9 | Email corporativo vinculado na criação do usuário |

---

## Models

### Setor

```python
class Setor(models.Model):
    nome      = CharField(max_length=100)
    descricao = CharField(max_length=255, blank=True)
    ativo     = BooleanField(default=True)
    criado_em = DateTimeField(auto_now_add=True)
```

Setores padrão via fixture:
`Diretoria | Comercial | Desenvolvimento | Financeiro | Suporte | Cliente`

### Usuario — campos novos

```python
class Perfil(models.TextChoices):
    ADMIN       = 'ADMIN',       'Administrador'
    FINANCEIRO  = 'FINANCEIRO',  'Financeiro'
    OPERACIONAL = 'OPERACIONAL', 'Operacional'
    CLIENTE     = 'CLIENTE',     'Cliente'

# Adicionar ao model existente:
perfil = CharField(max_length=20, choices=Perfil.choices, default=Perfil.OPERACIONAL)
setor  = ForeignKey('Setor', null=True, blank=True, on_delete=SET_NULL)
```

> ⚠️ Migration segura: usuários existentes recebem `perfil=ADMIN` via RunPython — não perder dados.

---

## Matriz de permissões

| Recurso | ADMIN | OPERACIONAL | FINANCEIRO | CLIENTE |
|---------|-------|-------------|------------|---------|
| Clientes | ✅ | ✅ | ❌ | ❌ |
| OS | ✅ | ✅ | ❌ | ✅ só próprias |
| Financeiro | ✅ | ❌ | ✅ | ✅ só próprias faturas |
| Suporte | ✅ | ✅ | ❌ | ✅ abre chamado |
| Email | ✅ | ✅ | ✅ | ❌ |
| Usuários | ✅ | ❌ | ❌ | ❌ |
| Setores | ✅ | ❌ | ❌ | ❌ |

---

## Permissões DRF

```python
# usuarios/permissions.py
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.perfil == 'ADMIN'

class IsAdminOrOperacional(BasePermission):
    def has_permission(self, request, view):
        return request.user.perfil in ['ADMIN', 'OPERACIONAL']

class IsAdminOrFinanceiro(BasePermission):
    def has_permission(self, request, view):
        return request.user.perfil in ['ADMIN', 'FINANCEIRO']
```

Aplicar imediatamente em todos os ViewSets existentes — nenhum endpoint fica sem permissão.

---

## Endpoint obrigatório — `/api/auth/me/`

```json
{
  "id": 1,
  "nome": "Luiz Eduardo",
  "email": "luizinferrera@gmail.com",
  "perfil": "ADMIN",
  "setor": { "id": 1, "nome": "Diretoria" },
  "email_corporativo": "luizeduardo@uidsoftware.com.br"
}
```

O frontend chama esse endpoint logo após o login pra montar tudo — sidebar, rotas, avatar.

---

## Sidebar dinâmica

```javascript
const menuPorPerfil = {
  ADMIN: [
    { label: 'Dashboard',     path: '/sistema/' },
    { label: 'Clientes',      path: '/sistema/clientes' },
    { label: 'OS',            path: '/sistema/os' },
    { label: 'Financeiro',    path: '/sistema/financeiro' },
    { label: 'Email',         path: '/sistema/email' },
    { label: 'Usuários',      path: '/sistema/usuarios' },
    { label: 'Configurações', path: '/sistema/configuracoes' },
  ],
  OPERACIONAL: [
    { label: 'Dashboard', path: '/sistema/' },
    { label: 'Clientes',  path: '/sistema/clientes' },
    { label: 'OS',        path: '/sistema/os' },
    { label: 'Email',     path: '/sistema/email' },
  ],
  FINANCEIRO: [
    { label: 'Dashboard',  path: '/sistema/' },
    { label: 'Financeiro', path: '/sistema/financeiro' },
    { label: 'Email',      path: '/sistema/email' },
  ],
  CLIENTE: [
    { label: 'Meus Projetos',   path: '/sistema/meus-projetos' },
    { label: 'Suporte',         path: '/sistema/suporte' },
    { label: 'Minhas Faturas',  path: '/sistema/minhas-faturas' },
  ],
}
```

---

## Rotas protegidas

```jsx
<PrivateRoute perfisPermitidos={['ADMIN']}>
  <UsuariosPage />
</PrivateRoute>

<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}>
  <ClientesPage />
</PrivateRoute>

<PrivateRoute perfisPermitidos={['ADMIN', 'FINANCEIRO']}>
  <FinanceiroPage />
</PrivateRoute>
```

Acesso negado → redireciona `/sistema/` + toast "Acesso não autorizado."

---

## Portal do Cliente — completo

Três telas reais, sem placeholder:

**MeusProjetos** (`/sistema/meus-projetos`)
- Lista todas as OS vinculadas ao `cliente_perfil` do usuário logado
- Colunas: Nome do projeto | Status | Fase atual | Última atualização
- Filtro por status (em andamento / concluído / aguardando)
- Clique na OS abre detalhe com linha do tempo das fases

**Suporte** (`/sistema/suporte`)
- Lista chamados abertos pelo cliente
- Botão "Abrir chamado" — formulário: título + descrição + prioridade
- Status por chamado: Aberto | Em atendimento | Resolvido
- Histórico completo de mensagens por chamado

**MinhasFaturas** (`/sistema/minhas-faturas`)
- Lista faturas vinculadas ao cliente logado
- Colunas: Descrição | Valor | Vencimento | Status (pago / pendente / atrasado)
- Badge de status colorido:
  - Pago → verde
  - Pendente → azul
  - Atrasado → vermelho `#FF0000`
- Filtro por status

> ⚠️ Backend: filtrar sempre por `request.user.cliente_perfil` — cliente nunca vê dados de outro cliente.

---

## Tela de Usuários — completa

`/sistema/usuarios` — só ADMIN

**Listagem:**
- Colunas: Nome | Email | Perfil (badge) | Setor | Email corporativo | Ativo | Ações
- Busca por nome ou email
- Filtro por perfil e setor
- Paginação — `response.data.results`

**Cadastro / Edição (modal):**
- Nome *
- Email * (login no sistema)
- Perfil * (Admin / Operacional / Financeiro / Cliente)
- Setor (select dos setores ativos)
- Email corporativo (`@uidsoftware.com.br`) → preenche `UsuarioEmailConfig`
- Senha inicial *
- Ativo (toggle)

**Badges de perfil:**
- ADMIN → vermelho `#FF0000`
- OPERACIONAL → azul `#063BF8`
- FINANCEIRO → verde `#10b981`
- CLIENTE → roxo `#3d0361`

**Soft delete:** desativar usuário — nunca deletar.

---

## Tela de Setores — completa

`/sistema/configuracoes/setores` — só ADMIN

- Listagem: Nome | Descrição | Nº usuários vinculados | Ativo
- CRUD completo
- Regra: não desativar setor com usuários ativos — mostrar erro claro

---

## Ordem de execução

```
ETAPA 1 — Backend: Models e migration
  → Criar Setor, adicionar perfil/setor ao Usuario
  → Migration com RunPython (existentes = ADMIN)
  → Fixture com setores padrão
  → Confirmar: make migrate sem erro ✅

ETAPA 2 — Backend: Permissões
  → Criar usuarios/permissions.py
  → Aplicar em TODOS os ViewSets existentes
  → Criar GET /api/auth/me/
  → Confirmar: 403 funcionando por perfil ✅

ETAPA 3 — Backend: CRUD Usuários e Setores
  → UsuarioViewSet + SetorViewSet completos
  → Confirmar: CRUD funcionando com permissões ✅

ETAPA 4 — Frontend: AuthContext
  → Chamar /api/auth/me/ após login
  → Armazenar perfil + setor no contexto
  → Confirmar: perfil disponível globalmente ✅

ETAPA 5 — Frontend: Sidebar + Rotas
  → Sidebar dinâmica por perfil
  → PrivateRoute com perfisPermitidos
  → Confirmar: cada perfil vê só seu menu ✅

ETAPA 6 — Frontend: Portal do Cliente
  → MeusProjetos + Suporte + MinhasFaturas completos
  → Confirmar: cliente só vê os próprios dados ✅

ETAPA 7 — Frontend: Telas Admin
  → UsuariosPage completa com CRUD + badges
  → SetoresPage completa
  → Confirmar: só ADMIN acessa ✅

ETAPA 8 — Testes e produção
  → Criar 1 usuário de cada perfil e testar manualmente
  → make test passando
  → Deploy produção
  → Atualizar CLAUDE.md ✅
```

---

## O que NÃO fazer

- ❌ Placeholder, "Em breve", tela vazia — tudo funciona ou não entra
- ❌ Deletar usuário — sempre `ativo=False`
- ❌ Cliente acessando dados de outro cliente
- ❌ Endpoint sem permissão — todos protegidos
- ❌ Sidebar hardcoded
- ❌ Access token em localStorage

---

## Checklist de conclusão

- [ ] Model Setor + fixture de setores padrão
- [ ] Usuario com perfil + setor, migration segura
- [ ] `permissions.py` aplicado em todos os ViewSets
- [ ] `/api/auth/me/` funcionando
- [ ] CRUD usuários e setores (só ADMIN)
- [ ] AuthContext com perfil
- [ ] Sidebar dinâmica por perfil
- [ ] PrivateRoute com perfisPermitidos
- [ ] Portal do Cliente completo (3 telas reais)
- [ ] UsuariosPage com CRUD + badges
- [ ] SetoresPage completa
- [ ] 4 perfis testados manualmente em produção
- [ ] `make test` passando
- [ ] CLAUDE.md atualizado

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1–4 | Setup, Vitrine, Auth, Webmail | ✅ |
| **Fase 5** | Perfis + Setores + Email vinculado | 🔄 Em execução |
| Fase 6 | OS — Ordens de Serviço | ⏳ |
| Fase 7 | Financeiro | ⏳ |
| Fase 8 | Dashboard + Levantamento de Requisitos | ⏳ |

---

**🐷 Produção direta. Sem enrolação. Bora codar, Claude Code!**

> Ao concluir, atualizar CLAUDE.md e fechar conversa pra liberar contexto.

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG | 19/04/2026*
