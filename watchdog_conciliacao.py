#!/usr/bin/env python3
"""
Watchdog de conciliação bancária.
Monitora a pasta Dropbox/Extratos e dispara conciliar_extrato
automaticamente quando um novo PDF é detectado.
"""
import glob
import logging
import os
import subprocess
import sys
import time
from pathlib import Path

PASTA = '/home/notuidsoftware/Dropbox/01 - Contabilidade/Extratos Onvio/Extratos'
CONTAINER = 'sytemd-backend-1'
INTERVALO = 300  # segundos entre verificações

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [watchdog] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger(__name__)


def inferir_conta(nome_arquivo: str) -> str | None:
    nome = nome_arquivo.upper()
    if 'C6' in nome:
        return 'C6'
    if 'BTG' in nome:
        return 'BTG'
    return None


def processar(pdf_path: str):
    nome = Path(pdf_path).name
    conta = inferir_conta(nome)
    if not conta:
        log.warning(f'Não foi possível inferir conta para: {nome}. Ignorado.')
        return

    log.info(f'Novo extrato detectado: {nome} (conta: {conta})')
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
                log.info(f'  {linha}')
        if resultado.returncode != 0 and resultado.stderr:
            log.error(f'Erro: {resultado.stderr[:300]}')
    except subprocess.TimeoutExpired:
        log.error(f'Timeout ao processar {nome}')
    except Exception as e:
        log.error(f'Falha ao processar {nome}: {e}')


def main():
    log.info(f'Iniciado. Monitorando: {PASTA}')
    processados: set[str] = set()

    # Na primeira execução, marcar todos os existentes como já processados
    # para não re-processar extratos antigos
    pdfs_iniciais = set(glob.glob(os.path.join(PASTA, '*.pdf')))
    processados.update(pdfs_iniciais)
    log.info(f'{len(pdfs_iniciais)} PDF(s) existente(s) ignorados na inicialização.')

    while True:
        try:
            pdfs_atuais = set(glob.glob(os.path.join(PASTA, '*.pdf')))
            novos = pdfs_atuais - processados
            for pdf in sorted(novos):
                processar(pdf)
                processados.add(pdf)
        except Exception as e:
            log.error(f'Erro na varredura: {e}')

        time.sleep(INTERVALO)


if __name__ == '__main__':
    main()
