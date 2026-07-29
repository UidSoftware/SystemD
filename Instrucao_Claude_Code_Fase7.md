# Instrucao_Claude_Code_Modulo_Entregas.md
# Sistema: Uid Software — SystemD
# Módulo: Entregas — Gestão e relatórios de entregas por empresa
> Uid Software | Versão: 1.0 | Etapa: Execução
> Última atualização: 19/04/2026
> ⚠️ Leia este arquivo INTEIRO antes de escrever qualquer linha de código.
> 🚨 Produção direta. Sem placeholder. Sem MVP. Entrega completa.

---

## Antes de começar

1. Leia o `CLAUDE.md` — memória do projeto
2. Confirme que a Fase 5 está concluída (perfis + setores funcionando)
3. O model `Cliente` já existe em `clientes/` — usar como FK
4. O model `Usuario` já existe em `usuarios/` — usar para autenticação
5. Só então escrever código

---

## Contexto

Módulo de registro e consulta de entregas, acessível em `/entregas/`.

**Quem registra:** apenas usuários internos da Uid (perfil ADMIN ou OPERACIONAL).
**Quem consulta:** a empresa cliente — via perfil CLIENTE, vê só as próprias entregas.
**Modelo:** multi-tenant — cada entrega pertence a uma empresa (Cliente). Isolamento total.
**Escalável:** o mesmo módulo atende N empresas. Cada empresa vê só os próprios dados.

Este módulo pode ser extraído futuramente como produto SaaS vertical independente (R$200/mês por empresa).

---

## Escopo — tudo entra, tudo funciona

| # | Entrega |
|---|---------|
| 1 | App `entregas/` com model completo |
| 2 | API REST com permissões por perfil |
| 3 | Isolamento multi-tenant no backend |
| 4 | Tela de registro (ADMIN/OPERACIONAL) |
| 5 | Tela de consulta do cliente (`/entregas/`) |
| 6 | Filtros por data, origem, destino, empresa |
| 7 | Exportação PDF por período |
| 8 | Exportação Excel por período |
| 9 | Rota pública com autenticação (`/entregas/`) |
| 10 | Sidebar atualizada com link Entregas |

---

## Model

### Entrega (`entregas/models.py`)

```python
class StatusEntrega(models.TextChoices):
    PENDENTE    = 'PENDENTE',    'Pendente'
    EM_ROTA     = 'EM_ROTA',     'Em rota'
    ENTREGUE    = 'ENTREGUE',    'Entregue'
    DEVOLVIDO   = 'DEVOLVIDO',   'Devolvido'
    CANCELADO   = 'CANCELADO',   'Cancelado'

class Entrega(models.Model):
    empresa     = ForeignKey(
                    'clientes.Cliente',
                    on_delete=PROTECT,
                    related_name='entregas'
                  )                              # tenant — isolamento por empresa
    data        = DateField()                    # data da entrega
    hora        = TimeField(null=True, blank=True)
    origem      = CharField(max_length=255)      # endereço/local de origem
    destino     = CharField(max_length=255)      # endereço/local de destino
    descricao   = TextField(blank=True)          # o que está sendo entregue
    status      = CharField(
                    max_length=15,
                    choices=StatusEntrega.choices,
                    default=StatusEntrega.PENDENTE
                  )
    registrado_por = ForeignKey(
                        'usuarios.Usuario',
                        on_delete=PROTECT,
                        related_name='entregas_registradas'
                     )
    observacoes = TextField(blank=True)
    ativo       = BooleanField(default=True)     # soft delete padrão Uid
    criado_em   = DateTimeField(auto_now_add=True)
    atualizado_em = DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data', '-hora']

    def __str__(self):
        return f"{self.empresa.nome_empresa} — {self.data} — {self.destino}"
```

> ⚠️ `empresa` é o campo tenant — **todo** queryset deve filtrar por ele.
> Nunca retornar entregas sem filtrar `empresa`.

---

## Isolamento multi-tenant — regra crítica

```python
# CORRETO — sempre filtrar por empresa
Entrega.objects.filter(empresa=request.user.cliente_perfil.empresa)

# ERRADO — nunca retornar tudo sem filtro
Entrega.objects.all()  # ← NUNCA em endpoint de cliente
```

Usuários internos (ADMIN/OPERACIONAL) podem filtrar por qualquer empresa.
Usuários CLIENTE só enxergam a própria empresa — filtro obrigatório no ViewSet.

---

## API — Endpoints

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/entregas/` | ADMIN, OPERACIONAL, CLIENTE | Lista entregas (CLIENTE: só próprias) |
| POST | `/api/entregas/` | ADMIN, OPERACIONAL | Registra entrega |
| GET | `/api/entregas/{id}/` | ADMIN, OPERACIONAL, CLIENTE (própria) | Detalhe |
| PATCH | `/api/entregas/{id}/` | ADMIN, OPERACIONAL | Edita entrega |
| DELETE | `/api/entregas/{id}/` | ADMIN | Soft delete |
| GET | `/api/entregas/exportar/pdf/` | ADMIN, OPERACIONAL, CLIENTE | PDF do período |
| GET | `/api/entregas/exportar/excel/` | ADMIN, OPERACIONAL, CLIENTE | Excel do período |

### Parâmetros de filtro (query string)

```
?empresa=1          # só ADMIN/OPERACIONAL
?data_inicio=2026-01-01
?data_fim=2026-04-19
?origem=Uberlândia
?destino=São Paulo
?status=ENTREGUE
?page=1
```

### ViewSet com isolamento automático

```python
# entregas/views.py

class EntregaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOperacionalOrCliente]
    filterset_fields = ['status', 'data', 'origem', 'destino']

    def get_queryset(self):
        user = self.request.user

        # CLIENTE — só vê a própria empresa
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if not cliente:
                return Entrega.objects.none()
            return Entrega.objects.filter(
                empresa=cliente,
                ativo=True
            )

        # ADMIN / OPERACIONAL — pode filtrar por empresa
        qs = Entrega.objects.filter(ativo=True)
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)
```

---

## Exportação PDF

```python
# entregas/export_pdf.py
# Usar WeasyPrint (já deve estar no requirements.txt)

from weasyprint import HTML
from django.template.loader import render_to_string
from django.http import HttpResponse

def exportar_pdf(entregas, empresa, data_inicio, data_fim):
    html_string = render_to_string('entregas/relatorio_pdf.html', {
        'entregas': entregas,
        'empresa': empresa,
        'data_inicio': data_inicio,
        'data_fim': data_fim,
        'total': entregas.count(),
    })
    pdf = HTML(string=html_string).write_pdf()
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="entregas_{empresa.nome_empresa}_{data_inicio}_{data_fim}.pdf"'
    )
    return response
```

Template `entregas/relatorio_pdf.html`:
- Logo Uid no header
- Nome da empresa, período
- Tabela: Data | Hora | Origem | Destino | Descrição | Status
- Total de entregas no rodapé
- Cores da paleta Uid

---

## Exportação Excel

```python
# entregas/export_excel.py
# Usar openpyxl

import openpyxl
from django.http import HttpResponse

def exportar_excel(entregas, empresa, data_inicio, data_fim):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Entregas"

    # Cabeçalho
    ws.append(['Empresa', 'Data', 'Hora', 'Origem', 'Destino', 'Descrição', 'Status'])

    for e in entregas:
        ws.append([
            e.empresa.nome_empresa,
            str(e.data),
            str(e.hora) if e.hora else '',
            e.origem,
            e.destino,
            e.descricao,
            e.get_status_display(),
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = (
        f'attachment; filename="entregas_{empresa.nome_empresa}_{data_inicio}_{data_fim}.xlsx"'
    )
    wb.save(response)
    return response
```

---

## Frontend — Tela do cliente (`/entregas/`)

### Rota
```
/sistema/entregas     → EntregasPage (PrivateRoute — ADMIN, OPERACIONAL, CLIENTE)
```

### Layout EntregasPage

**Header da página:**
- Título "Entregas" + nome da empresa (puxado do perfil logado)
- Botão "Nova entrega" (visível só pra ADMIN/OPERACIONAL)
- Botões "Exportar PDF" e "Exportar Excel" (todos)

**Filtros (linha acima da tabela):**
- Data início + Data fim (date picker)
- Origem (text)
- Destino (text)
- Status (select)
- Empresa (select — só ADMIN/OPERACIONAL)
- Botão "Filtrar" + "Limpar filtros"

**Contador de resultados (abaixo dos filtros):**
- Exibe: `"X entregas encontradas neste período"` — atualiza ao aplicar filtro
- Fonte bold, cor `#6b8fff`
- Zero resultados: `"Nenhuma entrega encontrada neste período"`

**Tabela de entregas:**
- Colunas: Data | Hora | Origem | Destino | Descrição | Status | Confirmação | Ações
- Badge de status colorido:
  - PENDENTE → amarelo
  - EM_ROTA → azul `#063BF8`
  - ENTREGUE → verde
  - DEVOLVIDO → laranja
  - CANCELADO → vermelho `#FF0000`
- Paginação — sempre `response.data.results`
- Responsivo — mobile first

**Coluna Confirmação:**
- Sem confirmação → dois botões: "✓ Confirmar" (verde) | "✗ Não confirmar" (vermelho)
- Confirmada → badge verde "Confirmado"
- Não confirmada → badge vermelho "Não confirmado" + motivo em tooltip
- Ao clicar "✗ Não confirmar" → abre modal:
  - "Por que a entrega não foi confirmada?"
  - Textarea obrigatório com o motivo
  - Botão "Enviar" — salva e atualiza linha
- ADMIN/OPERACIONAL vê coluna em modo leitura (não confirma pelo cliente)
- Só aparece para entregas com status ENTREGUE

**Modal de cadastro (ADMIN/OPERACIONAL):**
- Empresa * (select dos clientes ativos)
- Data * (date picker)
- Hora (time picker)
- Origem *
- Destino *
- Descrição
- Status *
- Observações

---

## Vitrine — Navbar: adicionar botão "Entrar"

Arquivo: `frontend/src/components/Navbar.jsx`

Adicionar botão "Entrar" à direita do CTA "Quero meu sistema":

```jsx
// Navbar.jsx — adicionar ao lado do CTA existente
<a href="/login" style={{
  padding: '10px 20px',
  borderRadius: 8,
  border: '1px solid rgba(6, 59, 248, 0.4)',
  background: 'transparent',
  color: '#f1f5f9',
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'all 0.15s',
}}>
  Entrar
</a>
```

**Regras:**
- Posição: à esquerda do botão "Quero meu sistema"
- Estilo: ghost/outline — não compete com o CTA principal
- Hover: `border-color: #063BF8` + `color: #6b8fff`
- Mobile: aparece no menu hamburguer como item de lista
- Redireciona para `/login` (rota já existente do sistema interno)

---

## Sidebar — atualizar

```javascript
// Adicionar em ADMIN e OPERACIONAL:
{ label: 'Entregas', icon: '📦', path: '/sistema/entregas' }

// Adicionar em CLIENTE:
{ label: 'Entregas', icon: '📦', path: '/sistema/entregas' }
```

---

## Dependencies novas

```bash
# requirements.txt — adicionar
weasyprint>=60.0      # geração de PDF
openpyxl>=3.1         # geração de Excel
django-filter>=23.0   # filtros automáticos no DRF
```

---

## Estrutura de arquivos

```
backend/
├── entregas/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── permissions.py
│   ├── export_pdf.py
│   ├── export_excel.py
│   └── templates/
│       └── entregas/
│           └── relatorio_pdf.html
frontend/
├── src/
│   └── pages/sistema/
│       └── EntregasPage.jsx    ← CRIAR
```

---

## Ordem de execução

```
ETAPA 1 — Backend: Model e API
  → Criar app entregas/
  → Model Entrega com soft delete
  → Serializer + ViewSet com isolamento multi-tenant
  → Endpoints de exportação PDF e Excel
  → Registrar em core/urls.py
  → Confirmar: make migrate sem erro ✅
  → Confirmar: isolamento funciona (CLIENTE não vê outra empresa) ✅

ETAPA 2 — Backend: Exportações
  → export_pdf.py com template HTML
  → export_excel.py com openpyxl
  → Confirmar: download funciona nos dois formatos ✅

ETAPA 3 — Frontend: EntregasPage
  → Listagem com filtros + paginação + badges
  → Modal de cadastro (ADMIN/OPERACIONAL)
  → Botões exportar PDF e Excel
  → Sidebar atualizada
  → Confirmar: CLIENTE vê só próprias entregas ✅
  → Confirmar: exportação baixa arquivo correto ✅

ETAPA 4 — Testes e produção
  → Criar entrega de teste pra empresa real
  → Logar como CLIENTE e confirmar isolamento
  → Testar exportação PDF e Excel
  → make test passando
  → Deploy produção
  → Atualizar CLAUDE.md ✅
```

---

## O que NÃO fazer

- ❌ `Entrega.objects.all()` sem filtro de empresa em endpoint de CLIENTE
- ❌ Soft delete esquecido — sempre `ativo=False`
- ❌ CLIENTE acessar endpoint de outra empresa
- ❌ FloatField — sem campos monetários aqui, mas se surgir: DecimalField
- ❌ `response.data` direto — sempre `response.data.results`

---

## Checklist de conclusão

- [ ] App `entregas/` criado com model completo
- [ ] Migration aplicada
- [ ] API com isolamento multi-tenant funcionando
- [ ] CLIENTE só vê próprias entregas (testado)
- [ ] Exportação PDF funcionando
- [ ] Exportação Excel funcionando
- [ ] EntregasPage com listagem + filtros + paginação
- [ ] Modal de cadastro (ADMIN/OPERACIONAL)
- [ ] Badges de status corretos
- [ ] Sidebar atualizada (ADMIN, OPERACIONAL, CLIENTE)
- [ ] make test passando
- [ ] Deploy em produção
- [ ] CLAUDE.md atualizado

---

## Potencial SaaS futuro

Este módulo resolve um problema real de qualquer empresa que faz entregas.
Quando estiver validado com o primeiro cliente:

- Extrair como produto independente
- Domínio próprio: `entregas.uidsoftware.com.br` ou produto batizado
- R$200/mês por empresa
- O SystemD vira o painel admin do produto

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Gerado em: 19/04/2026*

---

## Adendo — Model: campos de confirmação

```python
# Adicionar ao model Entrega

class ConfirmacaoEntrega(models.TextChoices):
    PENDENTE        = 'PENDENTE',        'Pendente'
    CONFIRMADA      = 'CONFIRMADA',      'Confirmada'
    NAO_CONFIRMADA  = 'NAO_CONFIRMADA',  'Não confirmada'

# campos a adicionar
confirmacao         = CharField(
                        max_length=20,
                        choices=ConfirmacaoEntrega.choices,
                        default=ConfirmacaoEntrega.PENDENTE
                      )
confirmacao_motivo  = TextField(blank=True)   # preenchido quando NAO_CONFIRMADA
confirmado_por      = ForeignKey(
                        'usuarios.Usuario',
                        null=True, blank=True,
                        on_delete=SET_NULL,
                        related_name='entregas_confirmadas'
                      )
confirmado_em       = DateTimeField(null=True, blank=True)
```

## Adendo — Endpoint de confirmação

```
PATCH /api/entregas/{id}/confirmar/
```

Payload:
```json
{ "confirmacao": "CONFIRMADA" }
// ou
{ "confirmacao": "NAO_CONFIRMADA", "confirmacao_motivo": "Produto chegou avariado" }
```

- Permissão: CLIENTE (só confirma entregas da própria empresa) + ADMIN
- Salva `confirmado_por` e `confirmado_em` automaticamente
- `confirmacao_motivo` obrigatório quando `confirmacao = NAO_CONFIRMADA`
