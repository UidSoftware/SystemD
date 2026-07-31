from django.db import models

from .validators import validar_documento


class BaseModel(models.Model):
    is_active = models.BooleanField('ativo', default=True)
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        abstract = True


class TipoPessoa(models.TextChoices):
    PF = 'PF', 'Pessoa Física'
    PJ = 'PJ', 'Pessoa Jurídica'


class PessoaBase(models.Model):
    """
    So o essencial de verdade (tipo_pessoa + documento validado) -- de
    proposito NAO extende BaseModel (Cliente ainda usa ativo/criado_em
    soltos, nao migrado pro padrao is_active/created_at -- mudar isso
    tambem tem blast radius grande demais pra essa fase, e nem inclui
    nome/telefone/email/endereco, porque Cliente e Fornecedor ja tem
    campos proprios pra isso (nome_empresa/forn_nome, forn_email/
    forn_telefone etc.) usados em varios lugares (recibo_pdf.py, sync com
    ContratID em orcamentos/services.py, Prospecto). Duplicar esses campos
    aqui so criaria dois lugares divergentes pra mesma coisa.

    Combinar com BaseModel via heranca multipla quando o model de destino
    ja usa BaseModel (caso do Fornecedor): `class X(BaseModel, PessoaBase)`.

    `cnpj_cpf`/`forn_cnpj` (os campos antigos, texto livre) continuam
    existindo do jeito que estao, sem validacao -- nao foram removidos de
    proposito, pra nao quebrar integracao real (ContratID, PDF de recibo).
    `documento` e o novo campo validado, convive com o antigo.
    """
    tipo_pessoa = models.CharField(
        'tipo de pessoa', max_length=2,
        choices=TipoPessoa.choices, default=TipoPessoa.PJ,
    )
    documento = models.CharField(
        'CPF/CNPJ', max_length=14,
        unique=True, null=True, blank=True,
        validators=[validar_documento],
        help_text='Apenas dígitos (sem máscara). Validado (dígito verificador).',
    )
    cpf = models.CharField('CPF', max_length=11, blank=True, default='', help_text='Apenas dígitos.')
    cnpj = models.CharField('CNPJ', max_length=14, blank=True, default='', help_text='Apenas dígitos.')

    class Meta:
        abstract = True
