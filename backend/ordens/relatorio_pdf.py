"""Gerador de PDF de relatorio consolidado de um sistema (OS) — Manutencao #68.

Segue o padrao visual/estrutural de orcamentos/orcamento_pdf.py (paleta
Uid, estilos via _style()) e reaproveita a formatacao de
common/pdf_utils.py::fmt_money/fmt_date -- nunca reimplementa formatacao
de moeda/data do zero (RN02/RN03).

Diferente dos geradores existentes (que retornam HttpResponse para o
PDF ser aberto direto no browser), esta funcao retorna os BYTES do PDF
(buffer.getvalue()) -- quem chama decide se anexa em email, salva em
disco (--dry-run) ou, no futuro, embrulha em HttpResponse (fora de
escopo desta Manutencao, ver secao 6 da Especificacao_Hotfix.md).

RN01: todo o conteudo vem de consulta real ao banco no momento da
chamada (fases/manutencoes/artefatos passados pelo chamador) -- esta
funcao nunca hardcoda nenhum dado de nenhum cliente especifico.
"""
import io
from datetime import datetime

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
UID_RED    = colors.HexColor('#ef4444')
UID_BORDER = colors.HexColor('#e2e8f0')
UID_LIGHT  = colors.HexColor('#f8f9fa')

_styles = getSampleStyleSheet()


def _style(name, **kwargs):
    base = kwargs.pop('parent', _styles['Normal'])
    return ParagraphStyle(name, parent=base, **kwargs)


def gerar_relatorio_sistema_pdf(os_obj) -> bytes:
    """Gera PDF consolidando o que foi criado/implantado para um sistema
    (OS), a partir de FaseOS + Manutencao + Artefato vinculados.

    Retorna os bytes do PDF (nao HttpResponse) -- quem chama decide se
    anexa em email, salva em disco, ou (no futuro) serve via HTTP.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
    )

    style_empresa     = _style('empresa', parent=_styles['Heading1'], textColor=UID_DARK, fontSize=16, leading=20, spaceAfter=2, fontName='Helvetica-Bold')
    style_sub_empresa = _style('sub_empresa', fontSize=9, leading=13, textColor=UID_GRAY, spaceAfter=1)
    style_titulo      = _style('titulo', parent=_styles['Heading1'], textColor=UID_BLUE, fontSize=14, leading=18, spaceAfter=0, fontName='Helvetica-Bold')
    style_meta        = _style('meta', fontSize=8.5, leading=13, textColor=UID_GRAY)
    style_label       = _style('label', fontSize=8, textColor=UID_GRAY)
    style_valor       = _style('valor', fontSize=11, textColor=UID_DARK, fontName='Helvetica-Bold')
    style_th          = _style('th', fontSize=8, textColor=colors.white, fontName='Helvetica-Bold')
    style_td          = _style('td', fontSize=8.5, textColor=UID_DARK)
    style_secao       = _style('secao', parent=_styles['Heading2'], textColor=UID_PURPLE, fontSize=11, spaceBefore=10, spaceAfter=5, fontName='Helvetica-Bold')
    style_texto       = _style('texto', fontSize=9, textColor=UID_DARK, leading=13)
    style_vazio       = _style('vazio', fontSize=9, textColor=UID_GRAY, leading=13, fontName='Helvetica-Oblique')
    style_bloqueio    = _style('bloqueio', fontSize=8.5, textColor=UID_RED, leading=12)
    style_footer      = _style('footer', fontSize=8, leading=12, textColor=UID_GRAY, alignment=1)

    elements = []
    page_width = A4[0] - 4 * cm

    # ── Cabecalho ────────────────────────────────────────────────────
    elements.append(Paragraph('Uid Software e Tecnologia LTDA', style_empresa))
    elements.append(Paragraph('CNPJ: 60.939.393/0001-25', style_sub_empresa))
    elements.append(Paragraph('Uberlândia/MG  |  contato@uidsoftware.com.br', style_sub_empresa))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(HRFlowable(width='100%', thickness=1, color=UID_BLUE, spaceAfter=0.3 * cm))
    elements.append(Paragraph('RELATÓRIO DO SISTEMA', style_titulo))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=UID_BORDER, spaceAfter=0.2 * cm))

    # ── Dados do projeto / cliente ──────────────────────────────────
    elements.append(Spacer(1, 0.2 * cm))
    cliente_nome = os_obj.cliente.nome_empresa if os_obj.cliente_id else '—'
    elements.append(Paragraph(f'{os_obj.titulo}', style_valor))
    elements.append(Paragraph(f'Cliente: {cliente_nome}', style_meta))
    elements.append(Paragraph(f'Status atual: {os_obj.get_status_display()}', style_meta))
    if os_obj.url:
        elements.append(Paragraph(f'URL: {os_obj.url}', style_meta))
    if os_obj.caminho_servidor:
        elements.append(Paragraph(f'Caminho no servidor: {os_obj.caminho_servidor}', style_meta))
    elements.append(Paragraph(
        f'Início: {fmt_date(os_obj.data_inicio)} &nbsp;|&nbsp; Entrega: {fmt_date(os_obj.data_entrega)}',
        style_meta,
    ))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Linha do tempo (FaseOS) ──────────────────────────────────────
    elements.append(Paragraph('Linha do Tempo', style_secao))
    fases = list(os_obj.fases.all())
    if fases:
        fases_header = [
            Paragraph('Data', style_th),
            Paragraph('Fase', style_th),
            Paragraph('Descrição', style_th),
        ]
        fases_rows = [fases_header]
        for fase in fases:
            fases_rows.append([
                Paragraph(fmt_date(fase.criado_em.date() if fase.criado_em else None), style_td),
                Paragraph(fase.get_fase_display(), style_td),
                Paragraph(fase.descricao or '—', style_td),
            ])
        n_fases = len(fases_rows) - 1
        fases_table = Table(
            fases_rows,
            colWidths=[page_width * 0.18, page_width * 0.27, page_width * 0.55],
            repeatRows=1,
        )
        fases_style = [
            ('BACKGROUND', (0, 0), (-1, 0), UID_BLUE),
            ('GRID', (0, 0), (-1, n_fases), 0.4, UID_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, n_fases), [colors.white, UID_LIGHT]),
        ]
        fases_table.setStyle(TableStyle(fases_style))
        elements.append(fases_table)
    else:
        elements.append(Paragraph('Nenhum registro encontrado nesta seção.', style_vazio))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Manutenções concluídas ──────────────────────────────────────
    manutencoes = list(os_obj.manutencoes.filter(ativo=True))
    concluidas = [m for m in manutencoes if m.feito or m.etapa == 'DEPLOYADO']
    pendentes = [m for m in manutencoes if not (m.feito or m.etapa == 'DEPLOYADO')]

    elements.append(Paragraph(f'Manutenções Concluídas ({len(concluidas)})', style_secao))
    if concluidas:
        for m in concluidas:
            elements.append(Paragraph(
                f'<b>#{m.pk}</b> — {m.descricao} '
                f'<font color="#6b6b8a">({fmt_date(m.etapa_atualizada_em.date() if m.etapa_atualizada_em else None)})</font>',
                style_texto,
            ))
    else:
        elements.append(Paragraph('Nenhum registro encontrado nesta seção.', style_vazio))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Manutenções pendentes/bloqueadas ────────────────────────────
    elements.append(Paragraph(f'Manutenções Pendentes / Bloqueadas ({len(pendentes)})', style_secao))
    if pendentes:
        for m in pendentes:
            etapa_label = m.get_etapa_display()
            elements.append(Paragraph(f'<b>#{m.pk}</b> — {m.descricao} <font color="#3d0361">[{etapa_label}]</font>', style_texto))
            if m.etapa == 'BLOQUEADA' and m.bloqueio_motivo:
                elements.append(Paragraph(f'↳ Bloqueio: {m.bloqueio_motivo}', style_bloqueio))
    else:
        elements.append(Paragraph('Nenhum registro encontrado nesta seção.', style_vazio))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Artefatos técnicos ──────────────────────────────────────────
    from django.contrib.contenttypes.models import ContentType
    from django.db.models import Q
    from artefatos.models import Artefato
    from .models import OS as OSModel, Manutencao as ManutencaoModel

    ct_os = ContentType.objects.get_for_model(OSModel)
    ct_manutencao = ContentType.objects.get_for_model(ManutencaoModel)
    manutencao_ids = [m.pk for m in manutencoes]
    artefatos = list(
        Artefato.objects.filter(ativo=True).filter(
            Q(content_type=ct_os, object_id=os_obj.pk) |
            Q(content_type=ct_manutencao, object_id__in=manutencao_ids)
        ).order_by('-criado_em')
    )

    elements.append(Paragraph(f'Artefatos Técnicos ({len(artefatos)})', style_secao))
    if artefatos:
        art_header = [
            Paragraph('Tipo', style_th),
            Paragraph('Agente', style_th),
            Paragraph('Título', style_th),
            Paragraph('Data', style_th),
        ]
        art_rows = [art_header]
        for art in artefatos:
            art_rows.append([
                Paragraph(art.get_tipo_display(), style_td),
                Paragraph(art.get_agente_display(), style_td),
                Paragraph(art.titulo or '—', style_td),
                Paragraph(fmt_date(art.criado_em.date() if art.criado_em else None), style_td),
            ])
        n_art = len(art_rows) - 1
        art_table = Table(
            art_rows,
            colWidths=[page_width * 0.22, page_width * 0.18, page_width * 0.42, page_width * 0.18],
            repeatRows=1,
        )
        art_style = [
            ('BACKGROUND', (0, 0), (-1, 0), UID_BLUE),
            ('GRID', (0, 0), (-1, n_art), 0.4, UID_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, n_art), [colors.white, UID_LIGHT]),
        ]
        art_table.setStyle(TableStyle(art_style))
        elements.append(art_table)
    else:
        elements.append(Paragraph('Nenhum registro encontrado nesta seção.', style_vazio))

    # ── Rodape ───────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.8 * cm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=UID_BORDER, spaceAfter=0.2 * cm))
    quando = datetime.now().strftime('%d/%m/%Y %H:%M')
    elements.append(Paragraph(f'Documento gerado em {quando} — Uid Software e Tecnologia LTDA', style_footer))

    doc.build(elements)
    valor = buffer.getvalue()
    buffer.close()
    return valor
