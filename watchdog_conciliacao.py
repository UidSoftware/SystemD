#!/usr/bin/env python3
"""
Watchdog de conciliacao bancaria.
Monitora a pasta Dropbox/Extratos e dispara conciliar_extrato
automaticamente quando um novo PDF e detectado ou um existente e modificado.
"""
import glob
import logging
import os
import subprocess
import time
from pathlib import Path

PASTA = '/home/notuidsoftware/Dropbox/01 - Contabilidade/Extratos Onvio/Extratos'
CONTAINER = 'sytemd-backend-1'
INTERVALO = 300

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [watchdog] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger(__name__)


def inferir_conta(nome_arquivo):
    nome = nome_arquivo.upper()
    if 'C6' in nome:
        return 'C6'
    if 'BTG' in nome:
        return 'BTG'
    return None


def processar(pdf_path):
    nome = Path(pdf_path).name
    conta = inferir_conta(nome)
    if not conta:
        log.warning('Nao foi possivel inferir conta para: %s. Ignorado.', nome)
        return

    log.info('Extrato detectado: %s (conta: %s)', nome, conta)
    cmd = [
        'docker', 'exec', CONTAINER,
        'python', 'manage.py', 'conciliar_extrato',
        '--arquivo', pdf_path,
        '--conta', conta,
    ]
    try:
        resultado = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if resultado.stdout:
            for linha in resultado.stdout.strip().splitlines():
                log.info('  %s', linha)
        if resultado.returncode != 0 and resultado.stderr:
            log.error('Erro: %s', resultado.stderr[:300])
    except subprocess.TimeoutExpired:
        log.error('Timeout ao processar %s', nome)
    except Exception as e:
        log.error('Falha ao processar %s: %s', nome, e)


def snapshot(pasta):
    return {
        p: os.path.getmtime(p)
        for p in glob.glob(os.path.join(pasta, '*.pdf'))
    }


def main():
    log.info('Iniciado. Monitorando: %s', PASTA)

    estado = snapshot(PASTA)
    log.info('%d PDF(s) existente(s) ignorados na inicializacao.', len(estado))

    while True:
        time.sleep(INTERVALO)
        try:
            atual = snapshot(PASTA)
            for pdf, mtime in atual.items():
                if pdf not in estado:
                    log.info('Arquivo novo: %s', Path(pdf).name)
                    processar(pdf)
                elif mtime != estado[pdf]:
                    log.info('Arquivo modificado (mtime mudou): %s', Path(pdf).name)
                    processar(pdf)
            estado = atual
        except Exception as e:
            log.error('Erro na varredura: %s', e)


if __name__ == '__main__':
    main()
