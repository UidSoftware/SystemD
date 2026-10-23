"""
Gera o relatorio consolidado da OS do Studio Fluir (PDF) e envia por
email -- Manutencao #68.

Resolve a OS dinamicamente (nunca hardcoda ID no codigo, RN01/RF06):
  1. --os-id explicito, se passado.
  2. Senao, uniao deduplicada de:
       OS.objects.filter(titulo__icontains='Studio Fluir')
       OS.objects.filter(cliente__nome_empresa__icontains='Studio Fluir')
  3. 0 resultados -> CommandError (RN08 -- nunca gera relatorio vazio).
  4. >1 resultado -> CommandError listando os IDs encontrados, pede
     --os-id explicito (RN08 -- nunca escolhe "o primeiro" silenciosamente).

--dry-run: salva o PDF em /tmp/relatorio_studio_fluir_<timestamp>.pdf e
    NAO envia email (RF07).
--destinatario: default luizeduardo@uidsoftware.com.br (RF08).
--os-id: forca a OS explicitamente, pula a busca por nome (secao 3).

O PDF e' gerado em memoria (io.BytesIO dentro de
ordens.relatorio_pdf::gerar_relatorio_sistema_pdf) e descartado apos o
envio -- nunca persiste em disco por padrao, exceto em --dry-run (RN09).
"""
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError

from ordens.models import OS
from ordens.relatorio_pdf import gerar_relatorio_sistema_pdf

DESTINATARIO_DEFAULT = 'luizeduardo@uidsoftware.com.br'


class Command(BaseCommand):
    help = (
        'Gera o relatorio em PDF da OS do Studio Fluir e envia por email '
        '(de contato@uidsoftware.com.br para o destinatario). '
        'Use --dry-run para apenas salvar o PDF em /tmp/ sem enviar email.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Salva o PDF em /tmp/ e NAO envia email.',
        )
        parser.add_argument(
            '--destinatario', type=str, default=DESTINATARIO_DEFAULT,
            help=f'Email de destino (default: {DESTINATARIO_DEFAULT}).',
        )
        parser.add_argument(
            '--os-id', type=int, default=None,
            help='Forca o ID da OS explicitamente, pula a busca por nome.',
        )

    def _resolver_os(self, os_id):
        if os_id is not None:
            try:
                return OS.objects.get(pk=os_id)
            except OS.DoesNotExist:
                raise CommandError(f'Nenhuma OS encontrada com --os-id={os_id}.')

        por_titulo = OS.objects.filter(titulo__icontains='Studio Fluir')
        por_cliente = OS.objects.filter(cliente__nome_empresa__icontains='Studio Fluir')
        encontradas = {o.pk: o for o in por_titulo}
        encontradas.update({o.pk: o for o in por_cliente})
        resultados = list(encontradas.values())

        if len(resultados) == 0:
            raise CommandError(
                "Nenhuma OS encontrada para 'Studio Fluir' — passe --os-id explicitamente."
            )
        if len(resultados) > 1:
            ids = ', '.join(str(o.pk) for o in resultados)
            raise CommandError(
                f'Mais de uma OS encontrada para \'Studio Fluir\' (IDs: {ids}) — '
                f'passe --os-id explicitamente para escolher.'
            )
        return resultados[0]

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        destinatario = options['destinatario']
        os_id = options['os_id']

        os_obj = self._resolver_os(os_id)
        self.stdout.write(self.style.SUCCESS(
            f'OS resolvida: #{os_obj.pk} — {os_obj.titulo}'
        ))

        try:
            pdf_bytes = gerar_relatorio_sistema_pdf(os_obj)
        except Exception as e:
            raise CommandError(f'Erro ao gerar o PDF do relatorio: {e}')

        if not pdf_bytes:
            raise CommandError('PDF gerado ficou vazio — abortando sem enviar email.')

        if dry_run:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            caminho = f'/tmp/relatorio_studio_fluir_{timestamp}.pdf'
            with open(caminho, 'wb') as f:
                f.write(pdf_bytes)
            self.stdout.write(self.style.SUCCESS(
                f'[dry-run] PDF salvo em {caminho} ({len(pdf_bytes)} bytes) — email NAO enviado.'
            ))
            return

        manutencoes = os_obj.manutencoes.filter(ativo=True)
        qtd_concluidas = manutencoes.filter(feito=True).count() or manutencoes.filter(etapa='DEPLOYADO').count()
        qtd_pendentes = manutencoes.count() - qtd_concluidas

        corpo_html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0014;color:#f1f5f9;border-radius:12px;">
          <h2 style="color:#063BF8;margin-bottom:8px;">uid<span style="color:#f1f5f9">.</span>sistema</h2>
          <p style="margin-bottom:24px;color:#a78bca;">Relatório de sistema</p>
          <p>Relatório consolidado de <strong>{os_obj.titulo}</strong>.</p>
          <p style="font-size:13px;color:#a78bca;">
            Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}<br>
            Manutenções concluídas: {qtd_concluidas}<br>
            Manutenções pendentes/bloqueadas: {qtd_pendentes}
          </p>
          <p style="font-size:12px;color:#6b6b8a;">O detalhe completo está no PDF anexado.</p>
        </div>
        """

        from email_client.services import enviar_email_sistema

        nome_arquivo = f'relatorio_{os_obj.titulo.lower().replace(" ", "_")}.pdf'
        try:
            enviar_email_sistema(
                destinatario,
                f'Relatório do sistema — {os_obj.titulo}',
                corpo_html,
                anexos=[(nome_arquivo, pdf_bytes, 'application/pdf')],
            )
        except Exception as e:
            raise CommandError(f'Erro ao enviar email: {e}')

        self.stdout.write(self.style.SUCCESS(
            f'Email enviado para {destinatario} com o relatorio de {os_obj.titulo} anexado.'
        ))
