import io
from datetime import date

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable


UID_BLUE   = colors.HexColor('#063BF8')
UID_PURPLE = colors.HexColor('#3d0361')
UID_DARK   = colors.HexColor('#0a0014')
UID_GRAY   = colors.HexColor('#6b6b8a')
UID_GREEN  = colors.HexColor('#10b981')


def _fmt_money(value):
    """Formata Decimal como moeda brasileira: R$ 1.234,56"""
    return f"R$ {value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def _fmt_date(value):
    """Formata date como dd/mm/aaaa ou '—' se None."""
    if value:
        return value.strftime('%d/%m/%Y')
    return '—'


def gerar_recibo_pdf(receita) -> HttpResponse:
    """
    Gera e retorna um PDF de recibo de pagamento para uma Receita com status=RECEBIDO.
    O PDF é retornado inline para o browser abrir em nova aba.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # ── Estilos personalizados ──────────────────────────────────────
    style_empresa = ParagraphStyle(
        'empresa',
        parent=styles['Heading1'],
        textColor=UID_DARK,
        fontSize=16,
        leading=20,
        spaceAfter=2,
        fontName='Helvetica-Bold',
    )
    style_sub_empresa = ParagraphStyle(
        'sub_empresa',
        parent=styles['Normal'],
        textColor=UID_GRAY,
        fontSize=9,
        leading=13,
        spaceAfter=1,
    )
    style_titulo_recibo = ParagraphStyle(
        'titulo_recibo',
        parent=styles['Heading1'],
        textColor=UID_BLUE,
        fontSize=14,
        leading=18,
        spaceAfter=0,
        alignment=1,  # centralizado
        fontName='Helvetica-Bold',
    )
    style_numero = ParagraphStyle(
        'numero',
        parent=styles['Normal'],
        textColor=UID_GRAY,
        fontSize=10,
        alignment=2,  # direita
        spaceAfter=4,
    )
    style_footer = ParagraphStyle(
        'footer',
        parent=styles['Normal'],
        textColor=UID_GRAY,
        fontSize=8,
        leading=12,
        alignment=1,
    )
    style_assinatura = ParagraphStyle(
        'assinatura',
        parent=styles['Normal'],
        textColor=UID_DARK,
        fontSize=10,
        leading=14,
        alignment=1,
        fontName='Helvetica-Bold',
    )

    elements = []

    # ── Cabeçalho ───────────────────────────────────────────────────
    elements.append(Paragraph('Uid Software e Tecnologia LTDA', style_empresa))
    elements.append(Paragraph('CNPJ: 60.939.393/0001-25', style_sub_empresa))
    elements.append(Paragraph('Uberlândia/MG  |  contato@uidsoftware.com.br', style_sub_empresa))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(HRFlowable(width='100%', thickness=1, color=UID_BLUE, spaceAfter=0.3 * cm))
    elements.append(Paragraph('RECIBO DE PAGAMENTO', style_titulo_recibo))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0'), spaceAfter=0.2 * cm))

    # ── Número do recibo (alinhado à direita) ────────────────────────
    elements.append(Paragraph(f'Nº {str(receita.id).zfill(6)}', style_numero))

    # ── Seção do cliente ─────────────────────────────────────────────
    elements.append(Spacer(1, 0.2 * cm))

    cliente_nome = '—'
    cliente_cnpj = None
    if receita.cliente:
        cliente_nome = receita.cliente.nome_empresa or '—'
        if hasattr(receita.cliente, 'cnpj_cpf') and receita.cliente.cnpj_cpf:
            cliente_cnpj = receita.cliente.cnpj_cpf

    page_width = A4[0] - 4 * cm  # largura útil

    # Tabela de cliente para layout lado a lado
    cliente_data = [
        [
            Paragraph('<b>RECEBEMOS DE:</b>', ParagraphStyle('h', parent=styles['Normal'], fontSize=8, textColor=UID_GRAY)),
            Paragraph('<b>CNPJ/CPF:</b>', ParagraphStyle('h', parent=styles['Normal'], fontSize=8, textColor=UID_GRAY)),
        ],
        [
            Paragraph(cliente_nome, ParagraphStyle('v', parent=styles['Normal'], fontSize=11, textColor=UID_DARK, fontName='Helvetica-Bold')),
            Paragraph(cliente_cnpj or '—', ParagraphStyle('v', parent=styles['Normal'], fontSize=10, textColor=UID_DARK)),
        ],
    ]
    cliente_table = Table(cliente_data, colWidths=[page_width * 0.65, page_width * 0.35])
    cliente_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(cliente_table)
    elements.append(Spacer(1, 0.4 * cm))

    # ── Tabela de valores ────────────────────────────────────────────
    valores_header = [
        Paragraph('<b>Descrição</b>', ParagraphStyle('h', parent=styles['Normal'], fontSize=8, textColor=colors.white)),
        Paragraph('<b>Valor</b>', ParagraphStyle('h', parent=styles['Normal'], fontSize=8, textColor=colors.white, alignment=2)),
    ]
    valores_rows = [valores_header]

    valores_rows.append([
        Paragraph('Valor Bruto', ParagraphStyle('r', parent=styles['Normal'], fontSize=9, textColor=UID_DARK)),
        Paragraph(_fmt_money(receita.valor_bruto), ParagraphStyle('r', parent=styles['Normal'], fontSize=9, textColor=UID_DARK, alignment=2)),
    ])

    if receita.desconto and receita.desconto > 0:
        valores_rows.append([
            Paragraph('Desconto', ParagraphStyle('r', parent=styles['Normal'], fontSize=9, textColor=UID_GRAY)),
            Paragraph(f'- {_fmt_money(receita.desconto)}', ParagraphStyle('r', parent=styles['Normal'], fontSize=9, textColor=UID_GRAY, alignment=2)),
        ])

    # Linha do valor líquido (destaque verde)
    valores_rows.append([
        Paragraph('<b>Valor Líquido (Total Recebido)</b>', ParagraphStyle('r', parent=styles['Normal'], fontSize=10, textColor=colors.white, fontName='Helvetica-Bold')),
        Paragraph(_fmt_money(receita.valor_liquido), ParagraphStyle('r', parent=styles['Normal'], fontSize=10, textColor=colors.white, fontName='Helvetica-Bold', alignment=2)),
    ])

    n_rows = len(valores_rows)
    last_row = n_rows - 1
    valores_table = Table(valores_rows, colWidths=[page_width * 0.70, page_width * 0.30])
    valores_table.setStyle(TableStyle([
        # Header azul
        ('BACKGROUND', (0, 0), (-1, 0), UID_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        # Linhas do meio
        ('BACKGROUND', (0, 1), (-1, last_row - 1), colors.white),
        ('GRID', (0, 0), (-1, last_row - 1), 0.4, colors.HexColor('#e2e8f0')),
        # Última linha (valor líquido) — fundo verde
        ('BACKGROUND', (0, last_row), (-1, last_row), UID_GREEN),
        ('BOX', (0, last_row), (-1, last_row), 0, colors.white),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(valores_table)
    elements.append(Spacer(1, 0.5 * cm))

    # ── Seção de detalhes ────────────────────────────────────────────
    detalhes_data = []

    def _detalhe_row(label, valor_str):
        return [
            Paragraph(label, ParagraphStyle('dl', parent=styles['Normal'], fontSize=8, textColor=UID_GRAY)),
            Paragraph(valor_str or '—', ParagraphStyle('dv', parent=styles['Normal'], fontSize=9, textColor=UID_DARK)),
        ]

    detalhes_data.append(_detalhe_row('Descrição', receita.descricao or '—'))
    detalhes_data.append(_detalhe_row('Tipo', receita.get_tipo_display()))

    if receita.categoria:
        detalhes_data.append(_detalhe_row('Categoria', receita.categoria.nome))

    if receita.os:
        detalhes_data.append(_detalhe_row('Ordem de Serviço', f'#{receita.os.id} — {receita.os.titulo}'))

    detalhes_data.append(_detalhe_row('Vencimento', _fmt_date(receita.vencimento)))
    detalhes_data.append(_detalhe_row('Data de Recebimento', _fmt_date(receita.recebimento)))
    detalhes_data.append(_detalhe_row('Conta', receita.conta.nome if receita.conta else '—'))

    if receita.referencia_mes:
        detalhes_data.append(_detalhe_row('Referência (mês)', _fmt_date(receita.referencia_mes)))

    if receita.observacoes:
        detalhes_data.append(_detalhe_row('Observações', receita.observacoes))

    detalhes_table = Table(detalhes_data, colWidths=[page_width * 0.28, page_width * 0.72])
    detalhes_table.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(detalhes_table)
    elements.append(Spacer(1, 1.0 * cm))

    # ── Rodapé ──────────────────────────────────────────────────────
    elements.append(Paragraph(f'Emitido em: {date.today().strftime("%d/%m/%Y")}', style_footer))
    elements.append(Spacer(1, 0.5 * cm))
    elements.append(HRFlowable(width='60%', thickness=0.5, color=UID_GRAY, hAlign='CENTER', spaceAfter=0.3 * cm))
    elements.append(Paragraph('Uid Software e Tecnologia LTDA', style_assinatura))
    elements.append(Paragraph('CNPJ: 60.939.393/0001-25', style_footer))

    # ── Build ────────────────────────────────────────────────────────
    doc.build(elements)
    buffer.seek(0)

    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="recibo_{str(receita.id).zfill(6)}.pdf"'
    return response
