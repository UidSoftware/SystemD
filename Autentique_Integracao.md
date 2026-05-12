# Autentique_Integracao.md
# Integração: Autentique API — Assinatura Digital de Contratos
# Destino: Fase 6 (OS) + Sistemas verticais Uid (Studio Fluir, etc.)
> Uid Software | Versão: 1.0
> Última atualização: 19/04/2026
> Documentação oficial: https://docs.autentique.com.br/api/sitemap.md

---

## Contexto

A Autentique é usada em dois cenários na Uid:

| Cenário | Onde | Para quê |
|---------|------|----------|
| **SystemD** | Sistema interno Uid | Contrato entre Uid e cliente assinado digitalmente |
| **Sistemas verticais** | Studio Fluir, Vitastudio, etc. | Cliente da Uid usa nos próprios contratos com alunos/clientes |

> ⚠️ A API da Autentique é **GraphQL** — não REST. Não existe endpoint REST.
> Endpoint único: `POST https://api.autentique.com.br/v2/graphql`

---

## Autenticação

```python
AUTENTIQUE_API_URL   = 'https://api.autentique.com.br/v2/graphql'
AUTENTIQUE_API_TOKEN = config('AUTENTIQUE_API_TOKEN')  # sempre via .env

headers = {
    'Authorization': f'Bearer {AUTENTIQUE_API_TOKEN}',
    'Content-Type': 'application/json',
}
```

> ⚠️ Token em `.env` — nunca hardcodar, nunca commitar.

---

## Fluxo completo de assinatura

```
1. OS muda para status CONTRATO
        ↓
2. SystemD gera o PDF do contrato
        ↓
3. SystemD envia o PDF para a Autentique (createDocument)
        ↓
4. Autentique retorna document_id + link de assinatura
        ↓
5. SystemD salva document_id no model Contrato
        ↓
6. SystemD envia link pro cliente (email ou WhatsApp)
        ↓
7. Cliente assina na Autentique
        ↓
8. Autentique dispara webhook → signature.accepted / document.signed
        ↓
9. SystemD recebe webhook → atualiza Contrato.status = 'ASSINADO'
        ↓
10. Signal Django → gera contas a receber no Financeiro
```

---

## Mutation: Criar documento (enviar para assinatura)

```python
# autentique/service.py

import requests
from django.conf import settings

QUERY_CREATE_DOCUMENT = """
mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
  createDocument(document: $document, signers: $signers, file: $file) {
    id
    name
    refusable
    sortable
    created_at
    files {
      original
      signed
    }
    signatures {
      public_id
      name
      email
      action { name }
      link { short_link }
      signed
    }
  }
}
"""

def criar_documento_autentique(contrato):
    """
    Envia o PDF do contrato para a Autentique e retorna o document_id
    e o link de assinatura do cliente.
    """
    # Gerar PDF do contrato (ver pdf_service.py)
    pdf_bytes = gerar_pdf_contrato(contrato)

    operations = {
        "query": QUERY_CREATE_DOCUMENT,
        "variables": {
            "document": {
                "name": f"Contrato {contrato.numero} — {contrato.os.cliente.nome_empresa}",
                "message": "Por favor, assine o contrato de prestação de serviços da Uid Software.",
                "refusable": True,       # cliente pode recusar
                "sortable": False,        # assinatura simultânea
            },
            "signers": [
                {
                    "email": contrato.os.cliente.email,
                    "action": "SIGN",     # SIGN | APPROVE | WITNESS
                    "name": contrato.os.cliente.nome_contato,
                },
                {
                    "email": "contato@uidsoftware.com.br",
                    "action": "SIGN",
                    "name": "Uid Software e Tecnologia LTDA",
                }
            ],
            "file": None,   # multipart — ver abaixo
        }
    }

    map_data = {"0": ["variables.file"]}

    response = requests.post(
        settings.AUTENTIQUE_API_URL,
        headers={"Authorization": f"Bearer {settings.AUTENTIQUE_API_TOKEN}"},
        data={
            "operations": json.dumps(operations),
            "map": json.dumps(map_data),
        },
        files={"0": (f"contrato_{contrato.numero}.pdf", pdf_bytes, "application/pdf")},
    )

    data = response.json()

    if "errors" in data:
        raise Exception(f"Autentique erro: {data['errors']}")

    documento = data["data"]["createDocument"]

    # Salvar document_id e link no Contrato
    contrato.autentique_document_id = documento["id"]
    contrato.autentique_link = documento["signatures"][0]["link"]["short_link"]
    contrato.status = "AGUARDANDO_ASSINATURA"
    contrato.save()

    return documento
```

---

## Query: Consultar status do documento

```python
QUERY_GET_DOCUMENT = """
query GetDocument($id: UUID!) {
  document(id: $id) {
    id
    name
    created_at
    signatures {
      public_id
      name
      email
      signed
      rejected
    }
    files {
      signed
    }
  }
}
"""

def consultar_documento_autentique(document_id):
    payload = {
        "query": QUERY_GET_DOCUMENT,
        "variables": {"id": document_id}
    }
    response = requests.post(
        settings.AUTENTIQUE_API_URL,
        headers={
            "Authorization": f"Bearer {settings.AUTENTIQUE_API_TOKEN}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    return response.json()["data"]["document"]
```

---

## Webhook — receber eventos da Autentique

### Registrar endpoint no painel Autentique:
`https://uidsoftware.com.br/api/autentique/webhook/`

### Eventos a escutar:
| Evento | Quando dispara |
|--------|---------------|
| `document.created` | Documento criado na Autentique |
| `document.updated` | Qualquer atualização no documento |
| `signature.accepted` | Um signatário assinou |
| `document.signed` | **Todos** os signatários assinaram ← mais importante |
| `signature.rejected` | Um signatário recusou |

### View do webhook (Django)

```python
# autentique/views.py

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from contratos.models import Contrato

@csrf_exempt
@require_POST
def autentique_webhook(request):
    try:
        payload = json.loads(request.body)
        event = payload.get("event", {})
        event_type = event.get("type")
        document = event.get("data", {}).get("object", {})
        document_id = document.get("id")

        if not document_id:
            return JsonResponse({"status": "ignored"}, status=200)

        # Retornar 200 IMEDIATAMENTE — processar de forma assíncrona
        # Em produção: usar Celery task para processar
        processar_evento_autentique(event_type, document_id, document)

        return JsonResponse({"status": "ok"}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


def processar_evento_autentique(event_type, document_id, document):
    try:
        contrato = Contrato.objects.get(autentique_document_id=document_id)
    except Contrato.DoesNotExist:
        return  # documento não pertence a este sistema

    if event_type == "document.signed":
        # Todos assinaram — contrato finalizado
        contrato.status = "ASSINADO"
        contrato.data_assinatura = timezone.now().date()
        contrato.autentique_link_assinado = document.get("files", {}).get("signed")
        contrato.save()

        # Disparar geração de contas no financeiro
        from financeiro.services import gerar_contas_contrato
        gerar_contas_contrato(contrato)

    elif event_type == "signature.accepted":
        # Um dos signatários assinou — registrar parcial
        contrato.status = "ASSINATURA_PARCIAL"
        contrato.save()

    elif event_type == "signature.rejected":
        # Alguém recusou — notificar admin
        contrato.status = "RECUSADO"
        contrato.save()
```

### URL no urls.py

```python
# core/urls.py
path('api/autentique/webhook/', autentique_webhook, name='autentique_webhook'),
```

---

## Model Contrato — campos a adicionar (Fase 6)

```python
class StatusContrato(models.TextChoices):
    RASCUNHO             = 'RASCUNHO',             'Rascunho'
    AGUARDANDO_ASSINATURA = 'AGUARDANDO_ASSINATURA', 'Aguardando assinatura'
    ASSINATURA_PARCIAL   = 'ASSINATURA_PARCIAL',   'Assinatura parcial'
    ASSINADO             = 'ASSINADO',             'Assinado'
    RECUSADO             = 'RECUSADO',             'Recusado'
    CANCELADO            = 'CANCELADO',            'Cancelado'

class Contrato(models.Model):
    # campos existentes...
    
    # campos Autentique — adicionar
    autentique_document_id  = CharField(max_length=100, blank=True)
    autentique_link         = URLField(blank=True)  # link de assinatura do cliente
    autentique_link_assinado = URLField(blank=True) # PDF final assinado
    status                  = CharField(
                                max_length=30,
                                choices=StatusContrato.choices,
                                default=StatusContrato.RASCUNHO
                              )
```

---

## Variáveis de ambiente necessárias

```bash
# .env
AUTENTIQUE_API_TOKEN=seu_token_aqui
AUTENTIQUE_API_URL=https://api.autentique.com.br/v2/graphql
AUTENTIQUE_SANDBOX=True   # False em produção
```

> ⚠️ Em sandbox, usar `https://sandbox.autentique.com.br/v2/graphql`
> Documentação sandbox: https://docs.autentique.com.br/api/integration-basics/sandbox-testes.md

---

## Estrutura de arquivos

```
backend/
├── autentique/
│   ├── __init__.py
│   ├── service.py      ← criar_documento, consultar_documento
│   ├── views.py        ← webhook endpoint
│   ├── urls.py
│   └── pdf_service.py  ← gerar PDF do contrato
```

---

## Regras obrigatórias

- ❌ Token nunca hardcoded — sempre `.env`
- ❌ Nunca processar lógica pesada dentro do webhook — retornar 200 primeiro
- ✅ Sempre verificar se `document_id` existe no banco antes de processar
- ✅ Usar sandbox durante desenvolvimento
- ✅ Logar todos os webhooks recebidos (mesmo os ignorados)
- ✅ O PDF assinado (`autentique_link_assinado`) deve ser salvo — é o documento com validade jurídica

---

## TODOs ao implementar

- [ ] Gerar token na conta Autentique e salvar no `.env` da VPS
- [ ] Registrar URL do webhook no painel Autentique
- [ ] Implementar `gerar_pdf_contrato()` em `pdf_service.py` (usar WeasyPrint ou ReportLab)
- [ ] Substituir número WhatsApp no envio do link de assinatura
- [ ] Testar fluxo completo no sandbox antes de produção
- [ ] Quando ContratoId estiver pronto — revisar este bloco e integrar

---
*Uid Software e Tecnologia LTDA — Uberlândia/MG*
*Gerado em: 19/04/2026*
