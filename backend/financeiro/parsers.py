"""Parsers de extrato bancário para conciliação automática."""
import re
import subprocess
import tempfile
from datetime import datetime
from decimal import Decimal
from pathlib import Path


def extrair_texto_pdf(caminho: str, senha: str = '609393') -> str:
    try:
        import pikepdf
    except ImportError:
        raise RuntimeError('pikepdf não instalado: pip install pikepdf')

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        tmp_path = tmp.name

    pdf = pikepdf.open(caminho, password=senha)
    pdf.save(tmp_path)
    pdf.close()

    resultado = subprocess.run(
        ['pdftotext', '-layout', tmp_path, '-'],
        capture_output=True, text=True
    )
    Path(tmp_path).unlink(missing_ok=True)
    return resultado.stdout


def _parse_valor(s: str) -> tuple[Decimal, str]:
    """Retorna (valor_absoluto, tipo)."""
    s = s.strip()
    negativo = s.startswith('-')
    limpo = re.sub(r'[R$\s\-]', '', s).replace('.', '').replace(',', '.')
    val = Decimal(limpo)
    tipo = 'SAIDA' if negativo else 'ENTRADA'
    return val, tipo


def parse_c6(texto: str, ano: int | None = None) -> list[dict]:
    """
    Parseia extrato C6 em formato texto.
    Retorna lista de {data, descricao, valor, tipo}.
    Formato esperado: DD/MM  DD/MM  (Entrada|Saída) ...  -R$ valor
    """
    if ano is None:
        ano = datetime.now().year

    resultados = []
    # Padrão: DD/MM  DD/MM  Tipo...  -?R$ 1.234,56
    padrao = re.compile(
        r'(\d{2}/\d{2})\s+\d{2}/\d{2}\s+'
        r'(Entrada|Sa[ií]da)\s+\S+'           # tipo + primeira palavra da desc
        r'(.+?)'                               # resto da descrição (lazy)
        r'\s+(-?R\$\s*[\d.,]+)',              # valor
        re.IGNORECASE,
    )

    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        # Pular cabeçalhos e totais
        if any(k in linha for k in ['Saldo', 'Entradas:', 'Saídas:', 'Data lançamento', 'Extrato']):
            continue

        m = padrao.search(linha)
        if m:
            data_str  = m.group(1)
            tipo_txt  = m.group(2).lower()
            desc      = (m.group(2) + ' ' + m.group(3)).strip()
            valor_str = m.group(4)

            try:
                dia, mes = data_str.split('/')
                data = datetime(ano, int(mes), int(dia)).date()
            except (ValueError, OverflowError):
                continue

            val, _ = _parse_valor(valor_str)
            tipo = 'ENTRADA' if 'entrada' in tipo_txt else 'SAIDA'

            resultados.append({
                'data': data,
                'descricao': desc[:500],
                'valor': val,
                'tipo': tipo,
            })

    return resultados


def parse_btg(texto: str, ano: int | None = None) -> list[dict]:
    """
    Parseia extrato BTG. Formato mais simples — pode não ter transações frequentes.
    Tenta detectar linhas com data + descrição + valor.
    """
    if ano is None:
        ano = datetime.now().year

    resultados = []
    padrao = re.compile(
        r'(\d{2}/\d{2}(?:/\d{2,4})?)\s+'
        r'(.+?)\s+'
        r'(-?R?\$?\s*[\d.,]+)\s*$'
    )

    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha or any(k in linha for k in ['Saldo', 'Total', 'Data', 'Extrato']):
            continue
        m = padrao.search(linha)
        if m:
            data_str  = m.group(1)
            desc      = m.group(2).strip()
            valor_str = m.group(3)

            try:
                partes = data_str.split('/')
                dia, mes = int(partes[0]), int(partes[1])
                data = datetime(ano, mes, dia).date()
            except (ValueError, OverflowError, IndexError):
                continue

            try:
                val, tipo = _parse_valor(valor_str)
            except Exception:
                continue

            resultados.append({
                'data': data,
                'descricao': desc[:500],
                'valor': val,
                'tipo': tipo,
            })

    return resultados


def inferir_categoria_descricao(descricao: str) -> str | None:
    """Tenta inferir uma categoria pelo nome na descrição."""
    desc_lower = descricao.lower()
    mapeamento = [
        (['aluguel', 'locação'], 'Aluguel'),
        (['contador', 'contabil', 'contábil', 'escritório contabil'], 'Contabilidade'),
        (['integrator', 'hostinger', 'aws', 'digitalocean', 'server', 'nuvem', 'cloud', 'infra'], 'Infraestrutura'),
        (['salario', 'salário', 'folha', 'remuner'], 'Pessoal'),
        (['energia', 'eletric', 'luz'], 'Energia'),
        (['telefon', 'internet', 'algar', 'vivo', 'claro', 'tim', 'telecom'], 'Telecomunicações'),
        (['imposto', 'das ', 'irpj', 'csll', 'pis', 'cofins', 'inss', 'fgts'], 'Impostos'),
        (['marketing', 'publicidade', 'anuncio', 'anúncio', 'trafego', 'tráfego'], 'Marketing'),
        (['software', 'licença', 'assinatura', 'subscription', 'github', 'figma', 'notion'], 'Software'),
    ]
    for palavras, categoria in mapeamento:
        if any(p in desc_lower for p in palavras):
            return categoria
    return None
