# Instrucao_Claude_Code_Fase3.md
# Sistema: Uid Software — Sistema Interno
# Fase 3 — Bloco de Valores (Vitrine) + Autenticação + Cadastro de Clientes
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. Confirme que a Fase 2 está concluída (vitrine no ar, `make test` passando)
3. Só então escreva código

---

## Contexto rápido

Esta fase tem duas frentes:

**Frente 1 — Vitrine (frontend):** Atualizar a seção Sobre com o bloco de Valores da Uid — texto escrito pelo fundador, com alma, que precisa entrar no site sem virar "lista de valores corporativos".

**Frente 2 — Sistema interno (backend + frontend):** Primeira entrega do módulo de gestão — autenticação JWT e cadastro completo de clientes. É a fundação que todas as fases seguintes (OS, Financeiro, Dashboard) vão depender.

---

## Escopo da Fase 3

### ✅ O que entra nesta fase

| # | Frente | Entrega | Descrição |
|---|--------|---------|-----------|
| 1 | Vitrine | Bloco de Valores | Atualizar About.jsx com novo bloco de valores |
| 2 | Sistema | Autenticação | Login JWT, refresh token, logout, rota protegida |
| 3 | Sistema | Model Cliente | Tabela completa de clientes no banco |
| 4 | Sistema | API Clientes | CRUD completo via DRF |
| 5 | Sistema | Tela Login | Página de login do sistema interno |
| 6 | Sistema | Tela Clientes | Listagem + cadastro + edição + soft delete |
| 7 | Sistema | App base | Estrutura do sistema interno (sidebar, layout, rotas protegidas) |

### ❌ O que NÃO entra nesta fase

- OS (Ordens de Serviço) — Fase 4
- Financeiro — Fase 5
- Dashboard — Fase 6
- Form de levantamento de requisitos — Fase 6
- Permissões por nível de usuário
- Recuperação de senha

---

## FRENTE 1 — Vitrine: Bloco de Valores

### Arquivo a modificar
`frontend/src/components/About.jsx`

### O que adicionar

Inserir bloco de Valores **após** os 3 cards de diferencial existentes (Sob medida de verdade / Parceria, não fornecimento / Interface pra quem usa).

### Texto oficial dos valores (imutável — escrito pelo fundador)

```
Nossos Valores

"Antes de ser uma empresa de tecnologia, a Uid é uma empresa de responsabilidade."

Quando você nos confia seu negócio, não estamos recebendo um projeto.
Estamos recebendo a agenda dos seus clientes, o controle do seu financeiro,
o registro dos seus sonhos.

Por isso trabalhamos com dois valores inegociáveis:

RESPEITO — pelo seu tempo, pelo seu negócio, pela sua realidade.
Não chegamos com solução pronta. Chegamos pra entender primeiro.

RESPONSABILIDADE — o sistema que entregamos tem vidas dependendo dele
funcionar. Isso a gente nunca esquece, nem depois da entrega,
nem quando ninguém tá olhando.

A Uid foi construída pra durar além das pessoas que a fundaram.
O que a gente deixa não é código — é a transformação real no negócio
de quem confiou na gente.
```

### Como renderizar

- Fundo: `#0a0014` (separar visualmente da seção roxa do About)
- Título: "Nossos Valores" — fonte display, destaque
- Quote em itálico, cor `--color-text-muted` (`#a78bca`)
- **RESPEITO** e **RESPONSABILIDADE** em destaque — cor `--color-brand-blue` (`#063BF8`), bold
- Texto corrido sem lista de bullets — é um texto com alma, não um slide corporativo
- Separador sutil (`border-top: 1px solid rgba(6, 59, 248, 0.2)`) antes do bloco

---

## FRENTE 2 — Sistema Interno

### Estrutura de pastas esperada ao final da Fase 3

```
uid-sistema/
├── backend/
│   ├── core/
│   ├── vitrine/
│   ├── usuarios/          ← CRIAR — autenticação customizada
│   ├── clientes/          ← CRIAR — model e API de clientes
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── VitrinePage.jsx        ← existente
│   │   │   ├── LoginPage.jsx          ← CRIAR
│   │   │   └── sistema/
│   │   │       ├── DashboardPage.jsx  ← placeholder vazio (Fase 6)
│   │   │       └── ClientesPage.jsx   ← CRIAR
│   │   ├── components/
│   │   │   ├── sistema/
│   │   │   │   ├── Sidebar.jsx        ← CRIAR
│   │   │   │   ├── Header.jsx         ← CRIAR
│   │   │   │   └── PrivateRoute.jsx   ← CRIAR
│   │   │   └── ... (vitrine existente)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx        ← CRIAR
│   │   └── App.jsx                    ← ATUALIZAR rotas
```

---

## Models obrigatórios nesta fase

### App: usuarios

Usar autenticação por **email** — nunca por username.

```python
# usuarios/models.py
class Usuario(AbstractBaseUser, PermissionsMixin):
    email        = EmailField(unique=True)        # login por email
    nome         = CharField(max_length=150)
    ativo        = BooleanField(default=True)     # soft delete padrão Uid
    is_staff     = BooleanField(default=False)
    criado_em    = DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
```

### App: clientes

| Campo | Tipo | Observações |
|-------|------|-------------|
| `id` | AutoField PK | — |
| `nome_empresa` | CharField(150) | Razão social ou nome fantasia |
| `nome_contato` | CharField(150) | Nome do responsável |
| `email` | EmailField | — |
| `telefone` | CharField(20) | — |
| `whatsapp` | CharField(20, blank=True) | — |
| `segmento` | CharField(50) | pilates, salao, loja, etc. |
| `cidade` | CharField(100, blank=True) | — |
| `estado` | CharField(2, blank=True) | UF |
| `cnpj_cpf` | CharField(20, blank=True) | — |
| `origem` | CharField(50) | como chegou: indicacao, site, etc. |
| `observacoes` | TextField(blank=True) | — |
| `ativo` | BooleanField(default=True) | soft delete — nunca usar .delete() |
| `criado_em` | DateTimeField(auto_now_add=True) | — |
| `atualizado_em` | DateTimeField(auto_now=True) | — |

> ⚠️ Soft delete obrigatório — nunca `cliente.delete()`, sempre `cliente.ativo = False; cliente.save()`

---

## Endpoints esperados ao final da Fase 3

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/token/` | Login — retorna access + refresh |
| POST | `/api/auth/token/refresh/` | Renova access token |
| POST | `/api/auth/logout/` | Invalida refresh token |

### Clientes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clientes/` | Lista clientes ativos (paginado) |
| POST | `/api/clientes/` | Cadastra novo cliente |
| GET | `/api/clientes/{id}/` | Detalhe do cliente |
| PUT/PATCH | `/api/clientes/{id}/` | Edita cliente |
| DELETE | `/api/clientes/{id}/` | Soft delete — seta ativo=False |

> ⚠️ Todas as rotas `/api/clientes/` exigem autenticação JWT — `IsAuthenticated`

---

## Autenticação — padrões obrigatórios

```python
# settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}
```

### Frontend — AuthContext.jsx

```jsx
// Responsabilidades do AuthContext:
// - Armazenar access token em memória (nunca localStorage)
// - Armazenar refresh token em httpOnly cookie (via backend)
// - Expor: { usuario, login, logout, isAutenticado }
// - Renovar access token automaticamente via interceptor Axios
```

> ⚠️ Access token NUNCA em localStorage — vulnerável a XSS

### PrivateRoute.jsx

```jsx
// Redireciona para /login se não autenticado
// Usado em todas as rotas do sistema interno
<PrivateRoute>
  <ClientesPage />
</PrivateRoute>
```

---

## Rotas do App.jsx ao final da Fase 3

```jsx
// Vitrine (pública)
/                    → VitrinePage

// Sistema interno (protegido)
/login               → LoginPage (pública)
/sistema/            → DashboardPage (placeholder) — PrivateRoute
/sistema/clientes    → ClientesPage — PrivateRoute
```

---

## Tela de Login — LoginPage.jsx

- Paleta dark da Uid (fundo `#0a0014`)
- Logo Uid centralizado no topo
- Campos: Email + Senha
- Botão: "Entrar"
- Sem cadastro público — sistema interno apenas
- Erro amigável: "E-mail ou senha incorretos"
- Redirect após login: `/sistema/`

---

## Tela de Clientes — ClientesPage.jsx

### Listagem
- Tabela com colunas: Nome da empresa | Segmento | Contato | Telefone | Cidade/UF | Ações
- Busca por nome ou segmento (filtro no frontend)
- Botão "Novo cliente" no topo direito
- Badge de segmento colorido (cor por tipo)
- Paginação — sempre `response.data.results` (nunca `response.data` direto)

### Cadastro / Edição
- Modal ou página separada (decisão na implementação)
- Todos os campos do model
- Validação client-side antes de enviar
- Feedback de sucesso/erro

### Soft Delete
- Botão "Desativar" com confirmação
- Cliente desativado some da listagem (filtro `ativo=True` no backend)

---

## Sidebar.jsx — estrutura base

```
[Logo Uid]
─────────────
Dashboard      (ícone + label) → /sistema/
Clientes       (ícone + label) → /sistema/clientes  ← ativo nesta fase
─────────────
OS             (desabilitado — Fase 4)
Financeiro     (desabilitado — Fase 5)
─────────────
[Avatar usuário]
Sair
```

- Itens desabilitados: opacity 0.4, cursor not-allowed, tooltip "Em breve"
- Paleta dark Uid: fundo `#0a0014`, item ativo com fundo `rgba(6, 59, 248, 0.15)` e borda esquerda `#063BF8`
- Collapsível no mobile

---

## Padrões obrigatórios (reforço)

- Autenticação por **email** — nunca username
- **Soft delete** — nunca `objeto.delete()`
- **Decimal** para valores monetários (não aplica nesta fase, mas já configurar)
- `response.data.results` — sempre, em toda listagem paginada
- Access token em **memória** — nunca localStorage
- `DEBUG=False` no `.env.prod`

---

## Ordem de execução obrigatória

```
ETAPA 1 — Vitrine: Bloco de Valores
  → Atualizar About.jsx com o bloco de valores
  → Confirmar: texto renderizando com visual correto ✅

ETAPA 2 — Backend: Autenticação
  → Criar app usuarios com model customizado
  → Instalar e configurar djangorestframework-simplejwt
  → Criar endpoints /api/auth/token/ e /api/auth/token/refresh/
  → Confirmar: POST /api/auth/token/ retorna tokens ✅

ETAPA 3 — Backend: Clientes
  → Criar app clientes com model completo
  → Criar serializer e viewset com soft delete
  → Registrar rotas /api/clientes/
  → Confirmar: CRUD funcionando via Postman/Thunder ✅

ETAPA 4 — Frontend: AuthContext + PrivateRoute
  → Criar AuthContext.jsx
  → Criar PrivateRoute.jsx
  → Atualizar App.jsx com rotas protegidas
  → Confirmar: rota /sistema/ redireciona para /login sem token ✅

ETAPA 5 — Frontend: Login
  → Criar LoginPage.jsx
  → Conectar com POST /api/auth/token/
  → Confirmar: login funciona e redireciona para /sistema/ ✅

ETAPA 6 — Frontend: Layout do sistema
  → Criar Sidebar.jsx e Header.jsx
  → Criar DashboardPage.jsx (placeholder)
  → Confirmar: layout base renderizando ✅

ETAPA 7 — Frontend: Clientes
  → Criar ClientesPage.jsx com listagem + cadastro + soft delete
  → Confirmar: CRUD completo funcionando na tela ✅

ETAPA 8 — Revisão e documentação
  → make test passando
  → Testar responsivo
  → Atualizar CLAUDE.md com status da Fase 3
  → Fechar conversa para liberar contexto ✅
```

---

## O que NÃO fazer

- ❌ Username no login — sempre email
- ❌ `cliente.delete()` — sempre soft delete
- ❌ Access token no localStorage
- ❌ `response.data` direto em listas — sempre `response.data.results`
- ❌ Criar tela de cadastro público de usuário
- ❌ Implementar OS ou Financeiro nesta fase
- ❌ Alterar a vitrine além do bloco de valores
- ❌ Comitar `.env`

---

## Checklist de conclusão da Fase 3

- [ ] Bloco de Valores atualizado no About.jsx
- [ ] App `usuarios` criado com model por email
- [ ] Endpoints JWT funcionando (`/api/auth/token/`)
- [ ] App `clientes` criado com todos os campos
- [ ] CRUD `/api/clientes/` funcionando com autenticação
- [ ] Soft delete implementado (ativo=False)
- [ ] AuthContext.jsx gerenciando token em memória
- [ ] PrivateRoute.jsx redirecionando sem autenticação
- [ ] LoginPage.jsx funcional
- [ ] Sidebar.jsx com itens futuros desabilitados
- [ ] ClientesPage.jsx com listagem + cadastro + edição + soft delete
- [ ] `make test` passando
- [ ] CLAUDE.md atualizado com status da Fase 3

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Setup + Vitrine base | ✅ Concluída |
| Fase 2 | Reconstrução completa da Vitrine | ✅ Concluída |
| **Fase 3** | Valores no site + Autenticação + Clientes | 🔄 Em execução |
| Fase 4 | OS — Ordens de Serviço | ⏳ Aguardando |
| Fase 5 | Financeiro | ⏳ Aguardando |
| Fase 6 | Dashboard + Form Levantamento de Requisitos | ⏳ Aguardando |

---

**🐷 A porca vai torcer o rabo! Bora codar, Claude Code!**

> ⚠️ Ao concluir cada etapa, atualizar o CLAUDE.md.
> Ao concluir a Fase 3, fechar a conversa para liberar contexto.

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Documento gerado em: 19/04/2026*
