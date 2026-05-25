# Instrucao_Claude_Code_Financeiro_Uid.md
# Sistema: Uid Software — SystemD
# Módulo: Financeiro — Refatoração completa para Software House
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 25/05/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.
> 🚨 Produção direta. Sem placeholder. Sem MVP. Entrega completa.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. O financeiro atual existe mas está errado para o contexto da Uid
3. **Fazer backup do banco antes de qualquer migration**
4. Os models antigos serão substituídos — ver seção "O que descartar"
5. Só então escrever código

---

## O que descartar do financeiro atual

```
❌ Produto
❌ PedidoItem / Pedido
❌ ServicoProduto
❌ PlanoContas (complexo demais para Micro Empresa)
❌ FolhaPagamento (sem CLT por enquanto)
❌ ClientePlano / PlanosPagamentos
```

## O que manter e adaptar

```
✅ Conta (banco/caixa) — adaptar para múltiplas contas
✅ ContasReceber — refatorar com tipos da Uid
✅ ContasPagar — refatorar com categorias reais
✅ LivroCaixa — manter imutável, gerado por signal
```

---

## Contexto real da Uid

A Uid é uma **Micro Empresa prestadora de serviços de TI** no Simples Nacional.
Não vende produto físico. Não tem CLT. Não tem estoque.

```
ENTRADAS                         SAÍDAS
──────────────────────────       ──────────────────────────────
Aporte (capital / sócio)         Despesa Fixa (VPS, domínio, tools)
Entrada de contrato (30%)        Despesa Variável (freelancer, sub)
Mensalidade recorrente           Pró-labore (fundador / futura sócia)
Consultoria avulsa               DAS / Imposto Simples Nacional
                                 Outros
```

Tudo passa pelo **LivroCaixa** — imutável, gerado automaticamente por signal.
DRE e Fluxo de Caixa são **views calculadas** sobre o LivroCaixa — sem model próprio.

---

## Models

### BaseFinanceiro (mixin abstrato)

```python
# financeiro/models.py

class BaseFinanceiro(models.Model):
    criado_em     = DateTimeField(auto_now_add=True)
    atualizado_em = DateTimeField(auto_now=True)
    criado_por    = ForeignKey('usuarios.Usuario', null=True, SET_NULL,
                                related_name='+')
    ativo         = BooleanField(default=True)  # soft delete

    class Meta:
        abstract = True
```

---

### Conta (banco / caixa)

```python
class TipoConta(TextChoices):
    CORRENTE  = 'CORRENTE',  'Conta Corrente'
    POUPANCA  = 'POUPANCA',  'Poupança'
    CAIXA     = 'CAIXA',     'Caixa'
    CARTEIRA  = 'CARTEIRA',  'Carteira Digital'

class Conta(BaseFinanceiro):
    nome        = CharField(max_length=100)   # ex: Nubank PJ, Caixa Uid
    tipo        = CharField(choices=TipoConta)
    banco       = CharField(max_length=100, blank=True)  # ex: Nubank, Bradesco
    agencia     = CharField(max_length=20, blank=True)
    numero      = CharField(max_length=30, blank=True)
    saldo_inicial = DecimalField(max_digits=12, decimal_places=2, default=0)
    # saldo atual = saldo_inicial + soma LivroCaixa desta conta
```

Contas padrão via fixture:
- Nubank PJ
- Caixa

---

### Aporte

```python
class TipoAporte(TextChoices):
    CAPITAL_SOCIAL = 'CAPITAL_SOCIAL', 'Capital Social'
    SOCIO          = 'SOCIO',          'Aporte de Sócio'
    INVESTIDOR     = 'INVESTIDOR',     'Aporte de Investidor'
    EMPRESTIMO     = 'EMPRESTIMO',     'Empréstimo'

class Aporte(BaseFinanceiro):
    tipo        = CharField(choices=TipoAporte)
    descricao   = CharField(max_length=255)     # ex: "Capital social inicial"
    valor       = DecimalField(max_digits=12, decimal_places=2)
    conta       = ForeignKey(Conta, on_delete=PROTECT)
    data        = DateField()
    responsavel = CharField(max_length=150)     # ex: "Luiz Eduardo"
    observacoes = TextField(blank=True)
    # signal: ao salvar → gera LivroCaixa entrada tipo APORTE
```

---

### Receita (entradas operacionais)

```python
class TipoReceita(TextChoices):
    ENTRADA_CONTRATO = 'ENTRADA_CONTRATO', 'Entrada de Contrato'
    MENSALIDADE      = 'MENSALIDADE',      'Mensalidade'
    CONSULTORIA      = 'CONSULTORIA',      'Consultoria Avulsa'
    OUTRO            = 'OUTRO',            'Outro'

class StatusReceita(TextChoices):
    PENDENTE  = 'PENDENTE',  'Pendente'
    RECEBIDO  = 'RECEBIDO',  'Recebido'
    CANCELADO = 'CANCELADO', 'Cancelado'
    ATRASADO  = 'ATRASADO',  'Atrasado'

class Receita(BaseFinanceiro):
    tipo            = CharField(choices=TipoReceita)
    descricao       = CharField(max_length=255)
    cliente         = ForeignKey('clientes.Cliente', null=True, blank=True,
                                  on_delete=PROTECT)       # opcional pra avulso
    os              = ForeignKey('ordens.OS', null=True, blank=True,
                                  on_delete=PROTECT)       # vinculada à OS quando automático
    valor_bruto     = DecimalField(max_digits=12, decimal_places=2)
    desconto        = DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_liquido   = DecimalField(max_digits=12, decimal_places=2)
                      # valor_liquido = valor_bruto - desconto — calcular no save()
    conta           = ForeignKey(Conta, on_delete=PROTECT)
    vencimento      = DateField()
    recebimento     = DateField(null=True, blank=True)  # preenchido quando RECEBIDO
    status          = CharField(choices=StatusReceita, default='PENDENTE')
    referencia_mes  = DateField(null=True, blank=True)  # para mensalidades: mês de referência
    observacoes     = TextField(blank=True)
    # signal: status → RECEBIDO → gera LivroCaixa entrada

    def save(self, *args, **kwargs):
        self.valor_liquido = self.valor_bruto - (self.desconto or 0)
        super().save(*args, **kwargs)
```

---

### Despesa (saídas)

```python
class TipoDespesa(TextChoices):
    FIXA        = 'FIXA',       'Despesa Fixa'        # VPS, domínio, ferramentas
    VARIAVEL    = 'VARIAVEL',   'Despesa Variável'    # freelancer, subcontratado
    PROLABORE   = 'PROLABORE',  'Pró-labore'          # retirada fundador / sócia
    IMPOSTO     = 'IMPOSTO',    'Imposto / DAS'       # Simples Nacional
    OUTRO       = 'OUTRO',      'Outro'

class StatusDespesa(TextChoices):
    PENDENTE  = 'PENDENTE',  'Pendente'
    PAGO      = 'PAGO',      'Pago'
    CANCELADO = 'CANCELADO', 'Cancelado'
    ATRASADO  = 'ATRASADO',  'Atrasado'

class Despesa(BaseFinanceiro):
    tipo            = CharField(choices=TipoDespesa)
    descricao       = CharField(max_length=255)    # ex: "VPS Contabo Maio/2026"
    fornecedor      = CharField(max_length=150, blank=True)  # texto livre — sem model
    valor_bruto     = DecimalField(max_digits=12, decimal_places=2)
    desconto        = DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_liquido   = DecimalField(max_digits=12, decimal_places=2)
                      # valor_liquido = valor_bruto - desconto
    conta           = ForeignKey(Conta, on_delete=PROTECT)
    vencimento      = DateField()
    pagamento       = DateField(null=True, blank=True)  # preenchido quando PAGO
    status          = CharField(choices=StatusDespesa, default='PENDENTE')
    referencia_mes  = DateField(null=True, blank=True)
    comprovante     = FileField(upload_to='despesas/', blank=True)  # anexo opcional
    observacoes     = TextField(blank=True)
    # signal: status → PAGO → gera LivroCaixa saída

    def save(self, *args, **kwargs):
        self.valor_liquido = self.valor_bruto - (self.desconto or 0)
        super().save(*args, **kwargs)
```

---

### LivroCaixa (imutável)

```python
class TipoLancamento(TextChoices):
    ENTRADA = 'ENTRADA', 'Entrada'
    SAIDA   = 'SAIDA',   'Saída'

class OrigemLancamento(TextChoices):
    APORTE   = 'APORTE',   'Aporte'
    RECEITA  = 'RECEITA',  'Receita'
    DESPESA  = 'DESPESA',  'Despesa'
    MANUAL   = 'MANUAL',   'Lançamento Manual'

class LivroCaixa(models.Model):
    """Imutável — nunca expor PUT/PATCH/DELETE. Correções via estorno."""
    conta           = ForeignKey(Conta, on_delete=PROTECT)
    tipo            = CharField(choices=TipoLancamento)
    origem          = CharField(choices=OrigemLancamento)
    origem_id       = PositiveIntegerField(null=True, blank=True)  # PK do objeto origem
    descricao       = CharField(max_length=255)
    valor           = DecimalField(max_digits=12, decimal_places=2)
    data            = DateField()
    saldo_anterior  = DecimalField(max_digits=12, decimal_places=2)
    saldo_atual     = DecimalField(max_digits=12, decimal_places=2)
    criado_em       = DateTimeField(auto_now_add=True)
    criado_por      = ForeignKey('usuarios.Usuario', null=True, SET_NULL, related_name='+')
    estornado       = BooleanField(default=False)
    estorno_de      = ForeignKey('self', null=True, blank=True, on_delete=SET_NULL)

    class Meta:
        ordering = ['-data', '-criado_em']
```

> ⚠️ `ReadCreateViewSet` — nunca expor PUT/PATCH/DELETE no LivroCaixa.
> Correções sempre via estorno: cria novo lançamento inverso + marca `estornado=True` no original.

---

## Signals automáticos

```python
# financeiro/signals.py

@receiver(post_save, sender=Aporte)
def aporte_para_livro_caixa(sender, instance, created, **kwargs):
    if created:
        _gerar_lancamento(
            conta=instance.conta,
            tipo='ENTRADA',
            origem='APORTE',
            origem_id=instance.id,
            descricao=f"Aporte: {instance.descricao}",
            valor=instance.valor,
            data=instance.data,
        )

@receiver(post_save, sender=Receita)
def receita_para_livro_caixa(sender, instance, **kwargs):
    if instance.status == 'RECEBIDO' and instance.recebimento:
        # só gera se ainda não gerou (checar por origem_id)
        if not LivroCaixa.objects.filter(origem='RECEITA', origem_id=instance.id).exists():
            _gerar_lancamento(
                conta=instance.conta,
                tipo='ENTRADA',
                origem='RECEITA',
                origem_id=instance.id,
                descricao=instance.descricao,
                valor=instance.valor_liquido,
                data=instance.recebimento,
            )

@receiver(post_save, sender=Despesa)
def despesa_para_livro_caixa(sender, instance, **kwargs):
    if instance.status == 'PAGO' and instance.pagamento:
        if not LivroCaixa.objects.filter(origem='DESPESA', origem_id=instance.id).exists():
            _gerar_lancamento(
                conta=instance.conta,
                tipo='SAIDA',
                origem='DESPESA',
                origem_id=instance.id,
                descricao=instance.descricao,
                valor=instance.valor_liquido,
                data=instance.pagamento,
            )
```

---

## Geração automática de Receita pela OS

Quando `OS.status` muda para `CONTRATO`:

```python
# ordens/signals.py

@receiver(post_save, sender=OS)
def os_gera_receitas(sender, instance, **kwargs):
    if instance.status != 'CONTRATO':
        return
    # Evitar duplicação
    if Receita.objects.filter(os=instance).exists():
        return

    conta_padrao = Conta.objects.filter(ativo=True).first()

    # Entrada de contrato (30%)
    if instance.valor_entrada:
        Receita.objects.create(
            tipo='ENTRADA_CONTRATO',
            descricao=f"Entrada contrato — {instance.cliente.nome_empresa}",
            cliente=instance.cliente,
            os=instance,
            valor_bruto=instance.valor_entrada,
            desconto=0,
            conta=conta_padrao,
            vencimento=date.today(),
            status='PENDENTE',
        )

    # Mensalidades recorrentes (gera 3 meses à frente)
    if instance.valor_mensal:
        for i in range(1, 4):
            venc = date.today().replace(day=1) + relativedelta(months=i)
            Receita.objects.create(
                tipo='MENSALIDADE',
                descricao=f"Mensalidade {venc.strftime('%m/%Y')} — {instance.cliente.nome_empresa}",
                cliente=instance.cliente,
                os=instance,
                valor_bruto=instance.valor_mensal,
                desconto=0,
                conta=conta_padrao,
                vencimento=venc,
                referencia_mes=venc,
                status='PENDENTE',
            )
```

> Cron sugerido para gerar mensalidades do mês seguinte:
> `python manage.py gerar_mensalidades` — todo dia 27 às 08:00

---

## Views calculadas (sem model)

### Fluxo de Caixa

```python
# GET /api/financeiro/fluxo-caixa/?mes=2026-05&conta=1

# Retorna por período:
{
  "periodo": "05/2026",
  "conta": "Nubank PJ",
  "saldo_inicial": "2500.00",
  "total_entradas": "3200.00",
  "total_saidas": "1400.00",
  "saldo_final": "4300.00",
  "lancamentos": [...]  # LivroCaixa do período
}
```

### DRE Simplificado

```python
# GET /api/financeiro/dre/?ano=2026

# Retorna por mês:
{
  "ano": 2026,
  "meses": [
    {
      "mes": "01/2026",
      "receita_bruta": "2000.00",
      "descontos": "100.00",
      "receita_liquida": "1900.00",
      "despesas_fixas": "500.00",
      "despesas_variaveis": "200.00",
      "prolabore": "800.00",
      "impostos": "100.00",
      "total_despesas": "1600.00",
      "resultado": "300.00"   # positivo = lucro | negativo = prejuízo
    },
    ...
  ],
  "totais_ano": {...}
}
```

### Receita por Cliente

```python
# GET /api/financeiro/receita-por-cliente/?ano=2026

# Retorna:
[
  {
    "cliente": "Studio Fluir",
    "total_bruto": "2400.00",
    "total_descontos": "0.00",
    "total_liquido": "2400.00",
    "mensalidades": 12,
    "entradas_contrato": 1,
  },
  ...
]
```

---

## Endpoints

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET/POST | `/api/financeiro/contas/` | ADMIN, FINANCEIRO | Contas bancárias |
| GET/POST | `/api/financeiro/aportes/` | ADMIN | Aportes de capital |
| GET/POST | `/api/financeiro/receitas/` | ADMIN, FINANCEIRO | Receitas |
| PATCH | `/api/financeiro/receitas/{id}/` | ADMIN, FINANCEIRO | Editar / marcar recebido |
| GET/POST | `/api/financeiro/despesas/` | ADMIN, FINANCEIRO | Despesas |
| PATCH | `/api/financeiro/despesas/{id}/` | ADMIN, FINANCEIRO | Editar / marcar pago |
| GET | `/api/financeiro/livro-caixa/` | ADMIN, FINANCEIRO | Extrato imutável |
| POST | `/api/financeiro/livro-caixa/{id}/estornar/` | ADMIN | Estorno |
| GET | `/api/financeiro/fluxo-caixa/` | ADMIN, FINANCEIRO | Fluxo por período + conta |
| GET | `/api/financeiro/dre/` | ADMIN, FINANCEIRO | DRE simplificado por ano |
| GET | `/api/financeiro/receita-por-cliente/` | ADMIN, FINANCEIRO | Receita agrupada por cliente |

Filtros receitas: `?tipo=`, `?status=`, `?cliente=`, `?os=`, `?vencimento_inicio=`, `?vencimento_fim=`
Filtros despesas: `?tipo=`, `?status=`, `?vencimento_inicio=`, `?vencimento_fim=`
Filtros livro-caixa: `?conta=`, `?data_inicio=`, `?data_fim=`, `?tipo=`

---

## Telas frontend

### Sidebar — Financeiro (submenu)

```
Financeiro
├── Visão Geral (Fluxo de Caixa)
├── Receitas
├── Despesas
├── Aportes
├── Livro Caixa
├── DRE
└── Por Cliente
```

### VisaoGeralPage — Fluxo de Caixa

- Seletor de mês + conta
- Cards: Saldo Inicial | Total Entradas | Total Saídas | Saldo Final
- Gráfico de barras: entradas vs saídas por semana do mês
- Tabela de lançamentos do LivroCaixa no período
- Badge por origem: APORTE (roxo) | RECEITA (verde) | DESPESA (vermelho)

### ReceitasPage

- Filtros: tipo, status, cliente, período de vencimento
- Tabela: Descrição | Cliente | OS | Tipo | Valor Bruto | Desconto | Valor Líquido | Vencimento | Status | Ações
- Badge status: PENDENTE (amarelo) | RECEBIDO (verde) | ATRASADO (vermelho) | CANCELADO (cinza)
- Botão "Nova receita" (manual)
- Ação "Marcar como recebido" → abre modal com data de recebimento + conta
- Receitas geradas automaticamente pela OS aparecem com ícone de link 🔗

### DespesasPage

- Filtros: tipo, status, período de vencimento
- Tabela: Descrição | Fornecedor | Tipo | Valor Bruto | Desconto | Valor Líquido | Vencimento | Status | Ações
- Badge tipo: FIXA (azul) | VARIAVEL (laranja) | PROLABORE (roxo) | IMPOSTO (vermelho) | OUTRO (cinza)
- Botão "Nova despesa"
- Ação "Marcar como pago" → abre modal com data pagamento + conta + comprovante (upload opcional)

### AportesPage

- Tabela: Data | Tipo | Descrição | Responsável | Valor | Conta | Ações
- Botão "Novo aporte" (só ADMIN)
- Badge tipo: CAPITAL_SOCIAL | SOCIO | INVESTIDOR | EMPRESTIMO

### LivroCaixaPage

- Filtros: conta, período, tipo (entrada/saída)
- Tabela: Data | Descrição | Origem | Entrada | Saída | Saldo | Estornado
- Linhas estornadas: opacity 0.5 + badge "Estornado"
- Botão "Estornar" (só ADMIN) → confirmação obrigatória + motivo
- ❌ Sem botão editar — registro imutável
- Exportar PDF / Excel do período

### DREPage

- Seletor de ano
- Tabela com meses nas colunas (Jan a Dez) + coluna Total Ano
- Linhas: Receita Bruta | Descontos | Receita Líquida | Despesas Fixas | Despesas Variáveis | Pró-labore | Impostos | **Resultado**
- Resultado positivo → verde | negativo → vermelho
- Exportar PDF

### PorClientePage

- Seletor de ano
- Cards por cliente: total recebido, total pendente, nº mensalidades, desconto total
- Ordenado por total líquido decrescente

---

## Desconto — regras

- `desconto` em `Receita` e `Despesa` é sempre em **R$** (valor absoluto), nunca percentual
- `valor_liquido = valor_bruto - desconto` — calculado no `save()` automaticamente
- Desconto não pode ser maior que `valor_bruto` — validar no serializer
- No frontend: mostrar campo desconto apenas quando usuário clicar em "Aplicar desconto"
- No LivroCaixa: sempre registrar `valor_liquido` — nunca o bruto

---

## Regras críticas deste módulo

- ❌ `LivroCaixa` sem PUT/PATCH/DELETE — `ReadCreateViewSet` + estorno
- ❌ `FloatField` em qualquer campo monetário — sempre `DecimalField`
- ❌ Gerar lançamento duplicado no LivroCaixa — checar `origem_id` antes
- ❌ Deletar Receita/Despesa com lançamento no LivroCaixa — bloquear no serializer, estornar primeiro
- ✅ `select_for_update()` + `transaction.atomic()` nos signals de saldo
- ✅ `valor_liquido` sempre calculado no `save()` — nunca confiar no frontend

---

## Ordem de execução

```
ETAPA 1 — Limpeza e migration
  → Remover apps/models descartados (Produto, Pedido, PlanoContas, etc.)
  → Criar migration de remoção
  → Criar novos models: Conta, Aporte, Receita, Despesa, LivroCaixa
  → Confirmar: make migrate sem erro ✅

ETAPA 2 — Signals
  → financeiro/signals.py com Aporte, Receita, Despesa → LivroCaixa
  → ordens/signals.py: OS status=CONTRATO → gera Receitas
  → Confirmar: marcar Receita como RECEBIDO gera LivroCaixa ✅

ETAPA 3 — API
  → ViewSets + permissões por perfil
  → Views calculadas: fluxo-caixa, dre, receita-por-cliente
  → Confirmar: endpoints funcionando com dados reais ✅

ETAPA 4 — Frontend: Receitas e Despesas
  → ReceitasPage + DespesasPage com filtros + modais
  → Confirmar: CRUD + marcar recebido/pago funcionando ✅

ETAPA 5 — Frontend: Aportes + Livro Caixa
  → AportesPage + LivroCaixaPage com estorno
  → Confirmar: estorno funciona + LivroCaixa não tem edição ✅

ETAPA 6 — Frontend: DRE + Por Cliente + Visão Geral
  → DREPage + PorClientePage + VisaoGeralPage com gráfico
  → Confirmar: DRE fecha com os dados do LivroCaixa ✅

ETAPA 7 — Testes e produção
  → Cadastrar aporte inicial real
  → Cadastrar despesas fixas reais (VPS, domínios, tools)
  → Vincular mensalidade Studio Fluir a uma OS
  → make test passando
  → Deploy produção
  → Atualizar CLAUDE.md ✅
```

---

## Checklist de conclusão

- [ ] Models antigos removidos (Produto, Pedido, etc.)
- [ ] Conta, Aporte, Receita, Despesa, LivroCaixa criados
- [ ] `valor_liquido` calculado no `save()` com desconto
- [ ] Signals funcionando (Aporte/Receita/Despesa → LivroCaixa)
- [ ] OS status=CONTRATO → gera Receitas automaticamente
- [ ] LivroCaixa sem PUT/PATCH/DELETE (só estorno)
- [ ] API completa com permissões
- [ ] Views calculadas: fluxo-caixa, dre, receita-por-cliente
- [ ] ReceitasPage com marcar recebido
- [ ] DespesasPage com marcar pago + upload comprovante
- [ ] AportesPage (só ADMIN)
- [ ] LivroCaixaPage com estorno
- [ ] DREPage com exportar PDF
- [ ] PorClientePage
- [ ] VisaoGeralPage com gráfico
- [ ] Aporte inicial cadastrado em produção
- [ ] Despesas fixas reais cadastradas
- [ ] make test passando
- [ ] CLAUDE.md atualizado

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Gerado em: 25/05/2026*
