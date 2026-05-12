# Instrucao_Claude_Code_Fase6.md
# Sistema: Uid Software — SystemD
# Fase 6 — OS: Ordens de Serviço
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.
> 🚨 Produção direta. Sem placeholder. Sem MVP. Entrega completa.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. Confirme que a Fase 5 está concluída (perfis + setores funcionando)
3. Só então escrever código

---

## Contexto

A OS (Ordem de Serviço) é o **coração do SystemD**. É o dossiê completo de cada cliente — tudo que acontece desde o primeiro contato até a manutenção recorrente vive dentro dela.

Fluxo real da Uid:
```
Lead → Cliente → OS aberta → Levantamento → Contrato → Dev → Entrega → Manutenção
```

A OS conecta tudo:
- Nasce vinculada a um **Cliente**
- Tem **fases** com status e datas
- Gera **contratos** com valores
- Alimenta o **Financeiro** (entrada + mensalidades)
- É visível para o **Cliente** no portal dele

---

## Escopo — tudo entra, tudo funciona

| # | Entrega |
|---|---------|
| 1 | Model OS com todas as fases do fluxo real |
| 2 | Model Contrato vinculado à OS |
| 3 | Model FaseOS — linha do tempo da OS |
| 4 | Model Chamado — suporte vinculado à OS |
| 5 | API completa com permissões por perfil |
| 6 | Tela de OS — listagem + detalhe completo |
| 7 | Tela de abertura de OS |
| 8 | Linha do tempo visual das fases |
| 9 | Contrato dentro da OS |
| 10 | Chamados de suporte dentro da OS |
| 11 | Geração automática de cobranças no Financeiro |
| 12 | Portal do cliente atualizado com OS real |

---

## Models

### OS (`os/models.py`)

```python
class StatusOS(models.TextChoices):
    LEAD          = 'LEAD',          'Lead'
    REUNIAO       = 'REUNIAO',       'Reunião agendada'
    LEVANTAMENTO  = 'LEVANTAMENTO',  'Levantamento'
    PROPOSTA      = 'PROPOSTA',      'Proposta enviada'
    CONTRATO      = 'CONTRATO',      'Contrato assinado'
    DESENVOLVIMENTO = 'DEV',         'Em desenvolvimento'
    ENTREGA       = 'ENTREGA',       'Entregue'
    MANUTENCAO    = 'MANUTENCAO',    'Manutenção ativa'
    CANCELADA     = 'CANCELADA',     'Cancelada'

class OS(models.Model):
    cliente         = ForeignKey('clientes.Cliente', on_delete=PROTECT)
    titulo          = CharField(max_length=200)
    descricao       = TextField(blank=True)
    status          = CharField(max_length=20, choices=StatusOS.choices, default='LEAD')
    responsavel     = ForeignKey('usuarios.Usuario', null=True, on_delete=SET_NULL,
                                  related_name='os_responsavel')
    valor_total     = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_entrada   = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_mensal    = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    data_inicio     = DateField(null=True, blank=True)
    data_entrega    = DateField(null=True, blank=True)
    observacoes     = TextField(blank=True)
    ativo           = BooleanField(default=True)
    criado_em       = DateTimeField(auto_now_add=True)
    atualizado_em   = DateTimeField(auto_now=True)
```

### FaseOS — linha do tempo

```python
class FaseOS(models.Model):
    os          = ForeignKey(OS, on_delete=CASCADE, related_name='fases')
    fase        = CharField(max_length=20, choices=StatusOS.choices)
    descricao   = TextField(blank=True)
    responsavel = ForeignKey('usuarios.Usuario', null=True, on_delete=SET_NULL)
    criado_em   = DateTimeField(auto_now_add=True)
    # Registro imutável — nunca editar, nunca deletar
    # Toda mudança de status da OS gera uma FaseOS automaticamente
```

### Contrato

```python
class Contrato(models.Model):
    os              = OneToOneField(OS, on_delete=CASCADE, related_name='contrato')
    numero          = CharField(max_length=50)        # ex: UID-2026-001
    valor_total     = DecimalField(max_digits=10, decimal_places=2)
    valor_entrada   = DecimalField(max_digits=10, decimal_places=2)
    percentual_entrada = DecimalField(max_digits=5, decimal_places=2, default=30)
    valor_mensal    = DecimalField(max_digits=10, decimal_places=2)
    data_assinatura = DateField(null=True, blank=True)
    observacoes     = TextField(blank=True)
    ativo           = BooleanField(default=True)
    criado_em       = DateTimeField(auto_now_add=True)
```

### Chamado — suporte

```python
class PrioridadeChamado(models.TextChoices):
    BAIXA  = 'BAIXA',  'Baixa'
    MEDIA  = 'MEDIA',  'Média'
    ALTA   = 'ALTA',   'Alta'
    URGENTE = 'URGENTE', 'Urgente'

class StatusChamado(models.TextChoices):
    ABERTO      = 'ABERTO',      'Aberto'
    ATENDIMENTO = 'ATENDIMENTO', 'Em atendimento'
    RESOLVIDO   = 'RESOLVIDO',   'Resolvido'

class Chamado(models.Model):
    os          = ForeignKey(OS, on_delete=CASCADE, related_name='chamados')
    aberto_por  = ForeignKey('usuarios.Usuario', on_delete=PROTECT,
                              related_name='chamados_abertos')
    titulo      = CharField(max_length=200)
    descricao   = TextField()
    prioridade  = CharField(max_length=10, choices=PrioridadeChamado.choices,
                             default='MEDIA')
    status      = CharField(max_length=15, choices=StatusChamado.choices,
                             default='ABERTO')
    resolvido_em = DateTimeField(null=True, blank=True)
    ativo       = BooleanField(default=True)
    criado_em   = DateTimeField(auto_now_add=True)
    atualizado_em = DateTimeField(auto_now=True)

class MensagemChamado(models.Model):
    chamado     = ForeignKey(Chamado, on_delete=CASCADE, related_name='mensagens')
    autor       = ForeignKey('usuarios.Usuario', on_delete=PROTECT)
    mensagem    = TextField()
    criado_em   = DateTimeField(auto_now_add=True)
    # Imutável — nunca editar mensagens
```

---

## Automação: OS → Financeiro

Quando a OS muda para status `CONTRATO`:
1. Criar automaticamente no Financeiro:
   - **Conta a receber** — entrada (30% do valor total) com vencimento imediato
   - **Conta a receber recorrente** — mensalidade com vencimento D+30, D+60, D+90...

Quando a OS muda para `CANCELADA`:
- Cancelar contas a receber futuras (não pagas)
- Registrar motivo do cancelamento

> Esta automação usa signal Django (`post_save` na OS).
> Importar o app `financeiro` dentro do signal — cuidado com import circular.

---

## Endpoints

### OS
| Método | Endpoint | Permissão |
|--------|----------|-----------|
| GET | `/api/os/` | ADMIN, OPERACIONAL |
| POST | `/api/os/` | ADMIN, OPERACIONAL |
| GET | `/api/os/{id}/` | ADMIN, OPERACIONAL, CLIENTE (própria) |
| PATCH | `/api/os/{id}/` | ADMIN, OPERACIONAL |
| POST | `/api/os/{id}/avancar/` | ADMIN, OPERACIONAL |
| DELETE | `/api/os/{id}/` | ADMIN (soft delete) |

### Contrato
| Método | Endpoint | Permissão |
|--------|----------|-----------|
| GET | `/api/os/{id}/contrato/` | ADMIN, OPERACIONAL, CLIENTE (próprio) |
| POST | `/api/os/{id}/contrato/` | ADMIN |
| PATCH | `/api/os/{id}/contrato/` | ADMIN |

### Chamados
| Método | Endpoint | Permissão |
|--------|----------|-----------|
| GET | `/api/os/{id}/chamados/` | ADMIN, OPERACIONAL, CLIENTE (próprios) |
| POST | `/api/os/{id}/chamados/` | Todos (CLIENTE pode abrir) |
| PATCH | `/api/chamados/{id}/` | ADMIN, OPERACIONAL |
| POST | `/api/chamados/{id}/mensagens/` | ADMIN, OPERACIONAL, CLIENTE |

---

## Tela de OS — listagem

`/sistema/os` — ADMIN e OPERACIONAL

- Colunas: Cliente | Título | Status (badge) | Responsável | Valor total | Data entrega | Ações
- Busca por cliente ou título
- Filtro por status (kanban ou lista — decisão na implementação)
- Ordenação por data de criação (mais recente primeiro)
- Botão "Nova OS" no topo direito
- Paginação — sempre `response.data.results`

**Badges de status:**
- LEAD → cinza
- REUNIAO → amarelo
- LEVANTAMENTO → laranja
- PROPOSTA → azul claro
- CONTRATO → azul `#063BF8`
- DESENVOLVIMENTO → roxo `#3d0361`
- ENTREGA → verde
- MANUTENCAO → verde escuro
- CANCELADA → vermelho `#FF0000`

---

## Tela de detalhe da OS

`/sistema/os/{id}` — layout em abas ou seções:

**Aba 1 — Resumo**
- Dados gerais: cliente, título, responsável, datas, valores
- Botão "Avançar fase" — muda status + registra FaseOS

**Aba 2 — Linha do tempo**
- Lista de FaseOS em ordem cronológica
- Visual de timeline vertical
- Cada entrada: fase | responsável | data | descrição

**Aba 3 — Contrato**
- Dados do contrato vinculado
- Botão "Registrar contrato" se ainda não existe
- Campos: número, valor total, entrada (%), mensalidade, data assinatura

**Aba 4 — Chamados**
- Lista de chamados com status e prioridade
- Botão "Novo chamado"
- Clique abre detalhe com histórico de mensagens
- Campo de resposta no final do histórico

---

## Portal do Cliente — atualizado

**MeusProjetos** — lista OS reais do cliente
- Status visual com badge
- Clique → detalhe da OS (abas: Resumo + Linha do tempo + Chamados)
- Sem aba Contrato no portal do cliente (valor é interno)

**Suporte** — chamados reais
- Lista chamados com status e prioridade
- Formulário de abertura de chamado vinculado à OS do cliente
- Histórico de mensagens por chamado

**MinhasFaturas** — alimentado pelo Financeiro (Fase 7)
- Por ora: lista de contratos com valores e status de pagamento

---

## Ordem de execução

```
ETAPA 1 — Backend: Models
  → Criar app os/
  → Models: OS, FaseOS, Contrato, Chamado, MensagemChamado
  → Migrations
  → Registrar no admin
  → Confirmar: make migrate sem erro ✅

ETAPA 2 — Backend: API
  → ViewSets com permissões por perfil
  → Endpoint /api/os/{id}/avancar/ — muda status + gera FaseOS
  → Signal post_save → gera contas no Financeiro ao chegar em CONTRATO
  → Confirmar: CRUD + avancar funcionando ✅

ETAPA 3 — Backend: Chamados
  → ViewSets Chamado + MensagemChamado
  → Filtro: cliente só vê chamados das próprias OS
  → Confirmar: cliente abre chamado, operacional responde ✅

ETAPA 4 — Frontend: Listagem de OS
  → OSPage com listagem + busca + filtro + badges
  → Confirmar: lista renderizando com dados reais ✅

ETAPA 5 — Frontend: Detalhe da OS
  → 4 abas: Resumo, Linha do tempo, Contrato, Chamados
  → Botão "Avançar fase" com confirmação
  → Timeline visual
  → Confirmar: fluxo completo funcionando ✅

ETAPA 6 — Frontend: Portal do Cliente
  → MeusProjetos com OS reais
  → Suporte com chamados reais + histórico
  → Confirmar: cliente vê só os próprios dados ✅

ETAPA 7 — Testes e produção
  → Criar OS de teste do zero até MANUTENCAO
  → Testar abertura de chamado pelo perfil CLIENTE
  → make test passando
  → Deploy produção
  → Atualizar CLAUDE.md ✅
```

---

## O que NÃO fazer

- ❌ Editar ou deletar FaseOS — registro imutável
- ❌ Editar ou deletar MensagemChamado — histórico imutável
- ❌ Cliente ver OS de outro cliente
- ❌ FloatField em qualquer campo de valor — sempre DecimalField
- ❌ Soft delete esquecido — toda OS cancelada usa `ativo=False`
- ❌ Import circular nos signals — cuidado ao importar financeiro

---

## Checklist de conclusão

- [ ] App `os/` criado com todos os models
- [ ] Migrations aplicadas
- [ ] API OS com permissões por perfil
- [ ] Endpoint `/avancar/` gerando FaseOS
- [ ] Signal gerando contas no Financeiro ao status CONTRATO
- [ ] API Chamados + Mensagens funcionando
- [ ] OSPage com listagem + badges + busca + filtro
- [ ] Detalhe da OS com 4 abas funcionando
- [ ] Timeline visual das fases
- [ ] Portal do Cliente atualizado com dados reais
- [ ] Chamados reais no portal do cliente
- [ ] OS testada do zero até MANUTENCAO
- [ ] `make test` passando
- [ ] CLAUDE.md atualizado

---

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1–4 | Setup, Vitrine, Auth, Webmail | ✅ |
| Fase 5 | Perfis + Setores + Email vinculado | ⏳ |
| **Fase 6** | OS — Ordens de Serviço | ⏳ após Fase 5 |
| Fase 7 | Financeiro | ⏳ |
| Fase 8 | Dashboard + Levantamento de Requisitos | ⏳ |

---

**🐷 Produção direta. Sem enrolação. Bora codar, Claude Code!**

> Ao concluir, atualizar CLAUDE.md e fechar conversa pra liberar contexto.

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG | 19/04/2026*
