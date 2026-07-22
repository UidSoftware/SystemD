"""
Emite tickets assinados (HMAC-SHA256, curta duracao, uso unico) para o
terminal_bridge.py (/opt/uid-automation) autenticar a sessao de PTY ao
vivo aberta pelo botao "Rodar no terminal" em Notificacoes. O bridge
roda fora do Django (processo a parte no host) e verifica esse mesmo
HMAC usando o SECRET_KEY compartilhado — sem depender de sessao/cookie
Django, so o segredo em comum.
"""
import base64
import hashlib
import hmac
import json
import time

from django.conf import settings

TICKET_TTL_SEGUNDOS = 60


def montar_briefing(manutencao):
    os_obj = manutencao.os
    return (
        f"MANUTENCAO_ID: {manutencao.id}\n"
        f"Sistema: {os_obj.titulo} (OS #{os_obj.id})\n"
        f"Cliente: {os_obj.cliente.nome_empresa}\n"
        f"Caminho: {manutencao.caminho}\n"
        f"CLAUDE.md: {manutencao.caminho}/CLAUDE.md\n\n"
        f"Tarefa:\n{manutencao.descricao}\n\n"
        "INSTRUCAO FINAL (somente apos Sentinel validar de verdade — subir "
        "containers, rodar migrate, testar endpoints reais — e Pilot "
        "confirmar deploy real em producao):\n"
        "Marcar manutencao como concluida via Bash:\n"
        f"  docker exec sytemd-backend-1 python manage.py disparar_hotfix --concluir {manutencao.id}\n"
    )


def emitir_ticket(manutencao, usuario):
    payload = {
        "manutencao_id": manutencao.id,
        "caminho": manutencao.caminho,
        "briefing": montar_briefing(manutencao),
        "user_email": usuario.email,
        "iat": time.time(),
        "exp": time.time() + TICKET_TTL_SEGUNDOS,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    assinatura = hmac.new(
        settings.SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256
    ).hexdigest()
    return f"{payload_b64}.{assinatura}"
