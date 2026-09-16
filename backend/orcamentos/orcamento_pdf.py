"""Gerador de PDF do Orcamento (Manutencao #61).

Segue o padrao visual/estrutural de financeiro/recibo_pdf.py (bloco de
destinatario, tabela de valores com linha de destaque verde) e reaproveita
a formatacao de common/pdf_utils.py (fmt_money/fmt_date) -- nunca
reimplementa formatacao de moeda/data do zero (RN02).
"""
import io
from datetime import datetime

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable

from common.pdf_utils import fmt_money, fmt_date

UID_BLUE   = colors.HexColor('#063BF8')
UID_PURPLE = colors.HexColor('#3d0361')
UID_DARK   = colors.HexColor('#0a0014')
UID_GRAY   = colors.HexColor('#6b6b8a')
UID_GREEN  = colors.HexColor('#10b981')
UID_BORDER = colors.HexColor('#e2e8f0')
UID_LIGHT  = colors.HexColor('#f8f9fa')

_styles = getSampleStyleSheet()


def _style(name, **kwargs):
    base = kwargs.pop('parent', _styles['Normal'])
    return ParagraphStyle(name, parent=base, **kwargs)


def _fmt_qtd(value):
    """Quantidade sem casas decimais desnecessarias (1 -> '1', 1.5 -> '1,5')."""
    if value is None:
        return '—'
    quant = value.normalize() if hasattr(value, 'normalize') else value
    texto = f'{quant:f}'
    if '.' in texto:
        texto = texto.rstrip('0').rstrip('.')
    return texto.replace('.', ',') or '0'


def gerar_orcamento_pdf(orcamento) -> HttpResponse:
    """
    Gera PDF do Orcamento (inline, para o browser abrir em nova aba).
    Segue o padrao visual/estrutural de financeiro/recibo_pdf.py.
    Nunca recalcula subtotal/total -- le de orcamento.subtotal /
    orcamento.total_geral (fonte unica de calculo, RN03).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
    )

    style_empresa      = _style('empresa', parent=_styles['Heading1'], textColor=UID_DARK, fontSize=16, leading=20, spaceAfter=2, fontName='Helvetica-Bold')
    style_sub_empresa  = _style('sub_empresa', fontSize=9, leading=13, textColor=UID_GRAY, spaceAfter=1)
    style_titulo       = _style('titulo', parent=_styles['Heading1'], textColor=UID_BLUE, fontSize=14, leading=18, spaceAfter=0, fontName='Helvetica-Bold')
    style_numero       = _style('numero', fontSize=10, textColor=UID_GRAY, alignment=2, spaceAfter=4)
    style_meta         = _style('meta', fontSize=8.5, leading=12, textColor=UID_GRAY)
    style_label        = _style('label', fontSize=8, textColor=UID_GRAY)
    style_valor        = _style('valor', fontSize=11, textColor=UID_DARK, fontName='Helvetica-Bold')
    style_valor_sec    = _style('valor_sec', fontSize=10, textColor=UID_DARK)
    style_th           = _style('th', fontSize=8, textColor=colors.white, fontName='Helvetica-Bold')
    style_td           = _style('td', fontSize=8.5, textColor=UID_DARK)
    style_total_label  = _style('total_label', fontSize=9.5, textColor=UID_DARK, alignment=2)
    style_total_valor  = _style('total_valor', fontSize=9.5, textColor=UID_DARK, alignment=2)
    style_dest_label   = _style('dest_label', fontSize=9.5, textColor=colors.white, fontName='Helvetica-Bold', alignment=2)
    style_dest_valor   = _style('dest_valor', fontSize=10.5, textColor=colors.white, fontName='Helvetica-Bold', alignment=2)
    style_secao        = _style('secao', parent=_styles['Heading2'], textColor=UID_PURPLE, fontSize=10.5, spaceBefore=8, spaceAfter=4, fontName='Helvetica-Bold')
    style_texto        = _style('texto', fontSize=9, textColor=UID_DARK, leading=13)
    style_footer       = _style('footer', fontSize=8, leading=12, textColor=UID_GRAY, alignment=1)

    elements = []
    page_width = A4[0] - 4 * cm

    # ── Cabecalho ────────────────────────────────────────────────────
    elements.append(Paragraph('Uid Software e Tecnologia LTDA', style_empresa))
    elements.append(Paragraph('CNPJ: 60.939.393/0001-25', style_sub_empresa))
    elements.append(Paragraph('Uberlândia/MG  |  contato@uidsoftware.com.br', style_sub_empresa))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(HRFlowable(width='100%', thickness=1, color=UID_BLUE, spaceAfter=0.3 * cm))
    elements.append(Paragraph('ORÇAMENTO', style_titulo))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=UID_BORDER, spaceAfter=0.2 * cm))
    elements.append(Paragraph(f'Nº {orcamento.numero:06d}', style_numero))

    # ── Destinatario (Cliente ou Prospecto) ─────────────────────────
    elements.append(Spacer(1, 0.2 * cm))
    if orcamento.cliente:
        rotulo = 'CLIENTE'
        nome = orcamento.cliente.nome_empresa or '—'
        documento = orcamento.cliente.cnpj_cpf or '—'
    elif orcamento.prospecto:
        rotulo = 'PROSPECTO'
        nome = orcamento.prospecto.nome_empresa or '—'
        documento = orcamento.prospecto.cnpj_cpf or '—'
    else:
        rotulo = '—'
        nome = '—'
        documento = '—'

    dest_data = [
        [
            Paragraph(f'<b>{rotulo}:</b>', style_label),
            Paragraph('<b>CNPJ/CPF:</b>', style_label),
        ],
        [
            Paragraph(nome, style_valor),
            Paragraph(documento, style_valor_sec),
        ],
    ]
    dest_table = Table(dest_data, colWidths=[page_width * 0.65, page_width * 0.35])
    dest_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), UID_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, UID_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, UID_BORDER),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(dest_table)
    elements.append(Spacer(1, 0.3 * cm))

    # ── Metadados: emitido / validade / status ──────────────────────
    elements.append(Paragraph(
        f'Emitido em: {fmt_date(orcamento.emitido_em)} &nbsp;|&nbsp; '
        f'Válido até: {fmt_date(orcamento.valido_ate)} &nbsp;|&nbsp; '
        f'Status: {orcamento.get_status_display()}',
        style_meta,
    ))
    elements.append(Spacer(1, 0.4 * cm))

    # ── Tabela de itens ──────────────────────────────────────────────
    itens_header = [
        Paragraph('Descrição', style_th),
        Paragraph('Un', style_th),
        Paragraph('Qtd', style_th),
        Paragraph('Valor Unit.', style_th),
        Paragraph('Subtotal', style_th),
    ]
    itens_rows = [itens_header]
    for item in orcamento.itens.all():
        itens_rows.append([
            Paragraph(item.descricao or '—', style_td),
            Paragraph(item.unidade or '—', style_td),
            Paragraph(_fmt_qtd(item.quantidade), style_td),
            Paragraph(fmt_money(item.valor_unitario), style_td),
            Paragraph(fmt_money(item.subtotal), style_td),
        ])

    n_itens = len(itens_rows) - 1
    itens_table = Table(
        itens_rows,
        colWidths=[page_width * 0.40, page_width * 0.10, page_width * 0.12, page_width * 0.19, page_width * 0.19],
        repeatRows=1,
    )
    itens_style = [
        ('BACKGROUND', (0, 0), (-1, 0), UID_BLUE),
        ('GRID', (0, 0), (-1, max(n_itens, 0)), 0.4, UID_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]
    if n_itens > 0:
        itens_style.append(('ROWBACKGROUNDS', (0, 1), (-1, n_itens), [colors.white, UID_LIGHT]))
    itens_table.setStyle(TableStyle(itens_style))
    elements.append(itens_table)
    elements.append(Spacer(1, 0.3 * cm))

    # ── Totais (RN03 — sempre a partir das properties do model) ─────
    totais_rows = [[
        Paragraph('Subtotal', style_total_label),
        Paragraph(fmt_money(orcamento.subtotal), style_total_valor),
    ]]

    if orcamento.desconto and orcamento.desconto > 0:
        totais_rows.append([
            Paragraph('Desconto (R$)', style_total_label),
            Paragraph(f'- {fmt_money(orcamento.desconto)}', style_total_valor),
        ])

    if orcamento.desconto_percentual and orcamento.desconto_percentual > 0:
        totais_rows.append([
            Paragraph(f'Desconto ({_fmt_qtd(orcamento.desconto_percentual)}%)', style_total_label),
            Paragraph(f'- {fmt_money(orcamento.subtotal * orcamento.desconto_percentual / 100)}', style_total_valor),
        ])

    totais_rows.append([
        Paragraph('TOTAL GERAL', style_dest_label),
        Paragraph(fmt_money(orcamento.total_geral), style_dest_valor),
    ])

    n_totais = len(totais_rows)
    last_totais = n_totais - 1
    totais_table = Table(totais_rows, colWidths=[page_width * 0.70, page_width * 0.30])
    totais_style = [
        ('GRID', (0, 0), (-1, last_totais - 1), 0.4, UID_BORDER),
        ('BACKGROUND', (0, last_totais), (-1, last_totais), UID_GREEN),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    totais_table.setStyle(TableStyle(totais_style))
    elements.append(totais_table)
    elements.append(Spacer(1, 0.4 * cm))

    # ── Forma de pagamento (condicional) ─────────────────────────────
    if orcamento.forma_pagamento:
        elements.append(Paragraph('Forma de Pagamento', style_secao))
        elements.append(Paragraph(orcamento.forma_pagamento, style_texto))

    # ── Observacoes (condicional) ─────────────────────────────────────
    if orcamento.observacoes:
        elements.append(Paragraph('Observações', style_secao))
        elements.append(Paragraph(orcamento.observacoes.replace('\n', '<br/>'), style_texto))

    # ── Rodape ──────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.8 * cm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=UID_BORDER, spaceAfter=0.2 * cm))
    quando = datetime.now().strftime('%d/%m/%Y %H:%M')
    elements.append(Paragraph(f'Documento gerado em {quando} — Uid Software e Tecnologia LTDA', style_footer))

    doc.build(elements)
    buffer.seek(0)

    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="orcamento_{orcamento.numero:06d}.pdf"'
    return response
