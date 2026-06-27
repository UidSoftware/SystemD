import time
import requests
from django.conf import settings
from django.utils import timezone

CONTRATID_URL = 'https://contratid.uidsoftware.com.br'
CONTRATID_EMPRESA_ID = 1


def _get_contratid_token():
    import jwt
    payload = {
        'email': 'contato@uidsoftware.com.br',
        'nome': 'Uid Software',
        'perfil': 'ADMIN',
        'setor': 'Administrativo',
        'token_type': 'access',
        'exp': int(time.time()) + 300,
    }
    systemd_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    res = requests.post(
        f'{CONTRATID_URL}/api/auth/sso/',
        json={'token': systemd_token},
        timeout=10,
    )
    res.raise_for_status()
    return res.json()['access']


def sync_to_contratid(orcamento):
    try:
        token = _get_contratid_token()
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

        # Resolve origem dos dados: cliente tem prioridade sobre prospecto
        cliente   = orcamento.cliente
        prospecto = orcamento.prospecto
        origem    = cliente or prospecto

        socio = None
        if cliente:
            socio = cliente.socios.filter(principal=True).first() or cliente.socios.first()
        elif prospecto:
            socio = prospecto.socios.filter(principal=True).first() or prospecto.socios.first()

        data = {
            'empresa':          CONTRATID_EMPRESA_ID,
            'valido_ate':       str(orcamento.valido_ate),
            'status':           orcamento.status,
            'cliente_nome':     origem.nome_empresa if origem else '',
            'cliente_email':    socio.email if socio else '',
            'cliente_telefone': socio.telefone if socio else '',
            'cliente_cpf_cnpj': origem.cnpj_cpf if origem else '',
            'cliente_cidade':   origem.cidade if origem else '',
            'cliente_estado':   origem.estado if origem else '',
            'desconto':         str(orcamento.desconto),
            'forma_pagamento':  orcamento.forma_pagamento,
            'observacoes':      orcamento.observacoes,
            'itens': [
                {
                    'ordem':          item.ordem,
                    'descricao':      item.descricao,
                    'quantidade':     str(item.quantidade),
                    'valor_unitario': str(item.valor_unitario),
                }
                for item in orcamento.itens.all()
            ],
        }

        if orcamento.contratid_orcamento_id:
            res = requests.patch(
                f'{CONTRATID_URL}/api/orcamentos/{orcamento.contratid_orcamento_id}/',
                json=data, headers=headers, timeout=15,
            )
        else:
            res = requests.post(
                f'{CONTRATID_URL}/api/orcamentos/',
                json=data, headers=headers, timeout=15,
            )

        res.raise_for_status()
        result = res.json()

        from .models import Orcamento
        Orcamento.objects.filter(pk=orcamento.pk).update(
            contratid_orcamento_id=result.get('id'),
            contratid_synced_at=timezone.now(),
        )
        return True, result.get('id')
    except Exception as e:
        return False, str(e)
