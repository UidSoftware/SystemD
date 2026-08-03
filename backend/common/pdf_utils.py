"""Utilitário genérico de geração de PDF pros relatórios do sistema.

Reaproveita o mesmo padrão visual já usado em financeiro/recibo_pdf.py e
entregas/export_pdf.py (reportlab, cores Uid Software) — não duplica a
lógica de cálculo de nenhum relatório, só formata o que a view já calcula.
Cada endpoint que chama isso reaproveita a MESMA permission_classes do
relatório original — "cada setor imprime o seu" sai de graça, não tem
lógica de permissão nova aqui.
"""
import io
from datetime import date, datetime

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape as landscape_page
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable

UID_BLUE   = colors.HexColor('#063BF8')
UID_PURPLE = colors.HexColor('#3d0361')
UID_DARK   = colors.HexColor('#0a0014')
UID_GRAY   = colors.HexColor('#6b6b8a')
UID_GREEN  = colors.HexColor('#10b981')
UID_RED    = colors.HexColor('#ef4444')
UID_LIGHT  = colors.HexColor('#f8f9fa')
UID_BORDER = colors.HexColor('#e2e8f0')

_styles = getSampleStyleSheet()


def _style(name, **kwargs):
    base = kwargs.pop('parent', _styles['Normal'])
    return ParagraphStyle(name, parent=base, **kwargs)


def fmt_money(value):
    """Formata número (Decimal/float/int) como moeda brasileira: R$ 1.234,56"""
    if value is None:
        return '—'
    return f"R$ {float(value):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def fmt_date(value):
    if not value:
        return '—'
    if isinstance(value, str):
        return value
    return value.strftime('%d/%m/%Y')


def _cabecalho(elements, titulo, subtitulo_linhas):
    style_empresa = _style('empresa', parent=_styles['Heading1'], textColor=UID_DARK, fontSize=14, leading=18, spaceAfter=1, fontName='Helvetica-Bold')
    style_sub_empresa = _style('sub_empresa', textColor=UID_GRAY, fontSize=8, leading=11, spaceAfter=1)
    style_titulo = _style('titulo', parent=_styles['Heading1'], textColor=UID_BLUE, fontSize=13, leading=17, spaceAfter=0, fontName='Helvetica-Bold')
    style_meta = _style('meta', textColor=UID_GRAY, fontSize=8.5, leading=12, spaceAfter=1)

    elements.append(Paragraph('Uid Software e Tecnologia LTDA', style_empresa))
    elements.append(Paragraph('CNPJ: 60.939.393/0001-25 &nbsp;|&nbsp; Uberlândia/MG &nbsp;|&nbsp; contato@uidsoftware.com.br', style_sub_empresa))
    elements.append(Spacer(1, 0.25 * cm))
    elements.append(HRFlowable(width='100%', thickness=1, color=UID_BLUE, spaceAfter=0.25 * cm))
    elements.append(Paragraph(titulo, style_titulo))
    for linha in (subtitulo_linhas or []):
        elements.append(Paragraph(linha, style_meta))
    elements.append(Spacer(1, 0.3 * cm))


def _rodape(elements, gerado_por=None):
    style_footer = _style('footer', textColor=UID_GRAY, fontSize=7.5, leading=11, alignment=1)
    elements.append(Spacer(1, 0.5 * cm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=UID_BORDER, spaceAfter=0.2 * cm))
    quando = datetime.now().strftime('%d/%m/%Y %H:%M')
    quem = f' por {gerado_por}' if gerado_por else ''
    elements.append(Paragraph(f'Relatório gerado em {quando}{quem} — Uid Software e Tecnologia LTDA', style_footer))


def gerar_pdf_tabela(titulo, headers, rows, subtitulo_linhas=None, filename='relatorio.pdf',
                      landscape=True, gerado_por=None, total_linha=None, col_widths=None):
    """Relatório tabular genérico (DRE, Fluxo de Caixa, Livro Caixa, Receitas,
    Despesas, Aportes, Receita por Cliente).

    headers: lista de strings.
    rows: lista de listas de strings (já formatadas — moeda/data já convertidas).
    total_linha: linha final opcional (destaque verde), mesmo formato de rows.
    """
    buffer = io.BytesIO()
    pagesize = landscape_page(A4) if landscape else A4
    doc = SimpleDocTemplate(
        buffer, pagesize=pagesize,
        rightMargin=1.5 * cm, leftMargin=1.5 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    )
    elements = []
    _cabecalho(elements, titulo, subtitulo_linhas)

    page_width = pagesize[0] - 3 * cm
    n_cols = len(headers)
    widths = col_widths or [page_width / n_cols] * n_cols

    header_style = _style('th', textColor=colors.white, fontSize=8, fontName='Helvetica-Bold')
    cell_style = _style('td', textColor=UID_DARK, fontSize=8)

    table_rows = [[Paragraph(h, header_style) for h in headers]]
    for row in rows:
        table_rows.append([Paragraph(str(v), cell_style) for v in row])

    n_data_rows = len(rows)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), UID_BLUE),
        ('GRID', (0, 0), (-1, n_data_rows), 0.4, UID_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, n_data_rows), [colors.white, UID_LIGHT]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]

    if total_linha:
        total_style = _style('tt', textColor=colors.white, fontSize=8.5, fontName='Helvetica-Bold')
        table_rows.append([Paragraph(str(v), total_style) for v in total_linha])
        last = len(table_rows) - 1
        style_cmds.append(('BACKGROUND', (0, last), (-1, last), UID_GREEN))
        style_cmds.append(('GRID', (0, last), (-1, last), 0, colors.white))

    table = Table(table_rows, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle(style_cmds))
    elements.append(table)
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(f'Total de registros: {len(rows)}', _style('count', textColor=UID_GRAY, fontSize=8)))

    _rodape(elements, gerado_por)
    doc.build(elements)
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


def gerar_pdf_resumo(titulo, secoes, subtitulo_linhas=None, filename='relatorio.pdf', gerado_por=None):
    """Relatório de seções label/valor (Balanço Patrimonial, Indicadores CFO).

    secoes: lista de dicts {
        'nome': str,
        'itens': [(label, valor_formatado), ...],
        'destaque': (label, valor_formatado) | None,  # linha de total, fundo verde
    }
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
    )
    elements = []
    _cabecalho(elements, titulo, subtitulo_linhas)

    page_width = A4[0] - 4 * cm
    style_secao = _style('secao', parent=_styles['Heading2'], textColor=UID_PURPLE, fontSize=11, spaceBefore=6, spaceAfter=4, fontName='Helvetica-Bold')
    label_style = _style('label', textColor=UID_GRAY, fontSize=9)
    valor_style = _style('valor', textColor=UID_DARK, fontSize=9, alignment=2)
    destaque_label = _style('dl', textColor=colors.white, fontSize=9.5, fontName='Helvetica-Bold')
    destaque_valor = _style('dv', textColor=colors.white, fontSize=9.5, fontName='Helvetica-Bold', alignment=2)

    for secao in secoes:
        elements.append(Paragraph(secao['nome'], style_secao))
        rows = [[Paragraph(l, label_style), Paragraph(v, valor_style)] for l, v in secao.get('itens', [])]
        style_cmds = [
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, UID_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.3, UID_BORDER),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        if secao.get('destaque'):
            rows.append([Paragraph(secao['destaque'][0], destaque_label), Paragraph(secao['destaque'][1], destaque_valor)])
            last = len(rows) - 1
            style_cmds.append(('BACKGROUND', (0, last), (-1, last), UID_PURPLE))
            style_cmds.append(('GRID', (0, last), (-1, last), 0, colors.white))
        if rows:
            table = Table(rows, colWidths=[page_width * 0.6, page_width * 0.4])
            table.setStyle(TableStyle(style_cmds))
            elements.append(table)
        elements.append(Spacer(1, 0.3 * cm))

    _rodape(elements, gerado_por)
    doc.build(elements)
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
