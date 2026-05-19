import io
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer


UID_BLUE = colors.HexColor('#063BF8')
UID_DARK = colors.HexColor('#0a0014')
UID_GRAY = colors.HexColor('#6b6b8a')


def exportar_pdf(entregas, empresa, data_inicio, data_fim):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=landscape(A4),
        rightMargin=1.5 * cm, leftMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', parent=styles['Heading1'], textColor=UID_BLUE, fontSize=16, spaceAfter=4)
    sub_style = ParagraphStyle('sub', parent=styles['Normal'], textColor=UID_GRAY, fontSize=9, spaceAfter=2)

    elements = []
    elements.append(Paragraph('Uid Software — Relatório de Entregas', title_style))

    empresa_nome = empresa.nome_empresa if empresa else 'Todas as empresas'
    elements.append(Paragraph(f'Empresa: {empresa_nome}', sub_style))
    if data_inicio or data_fim:
        elements.append(Paragraph(f'Período: {data_inicio or "—"} a {data_fim or "—"}', sub_style))
    elements.append(Spacer(1, 0.4 * cm))

    header = ['Data', 'Hora', 'Solicitante', 'Unidade', 'De', 'Para', 'Motoboy', 'Descrição', 'Status', 'Confirmação']
    rows = [header]
    for e in entregas:
        rows.append([
            str(e.data),
            str(e.hora)[:5] if e.hora else '—',
            e.solicitante or '—',
            e.unidade.nome if e.unidade else '—',
            e.de.nome if e.de else '—',
            e.para.nome if e.para else '—',
            e.motoboy or '—',
            e.descricao[:40] + '…' if e.descricao and len(e.descricao) > 40 else (e.descricao or '—'),
            e.get_status_display(),
            e.get_confirmacao_display(),
        ])

    col_widths = [2.5*cm, 1.8*cm, 3.5*cm, 3*cm, 3.5*cm, 3.5*cm, 3*cm, 5*cm, 2.5*cm, 3*cm]
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), UID_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f'Total: {len(entregas)} entrega(s)', sub_style))

    doc.build(elements)
    buffer.seek(0)

    nome = (empresa.nome_empresa.replace(' ', '_') if empresa else 'todas') + f'_{data_inicio}_{data_fim}'
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="entregas_{nome}.pdf"'
    return response
