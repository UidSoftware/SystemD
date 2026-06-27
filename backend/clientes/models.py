from django.db import models
from django.conf import settings


class Cliente(models.Model):
    nome_empresa  = models.CharField(max_length=150)
    dominio_email = models.CharField(max_length=100, blank=True, help_text='Ex: empresacliente.com.br')
    usuario       = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cliente_perfil',
    )
    segmento      = models.CharField(max_length=50)
    cidade        = models.CharField(max_length=100, blank=True)
    estado        = models.CharField(max_length=2, blank=True)
    cnpj_cpf      = models.CharField(max_length=20, blank=True)
    origem        = models.CharField(max_length=50)
    observacoes   = models.TextField(blank=True)
    tem_entregas  = models.BooleanField(default=False)
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['-criado_em']

    def __str__(self):
        return self.nome_empresa


class SocioCliente(models.Model):
    cliente   = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='socios')
    nome      = models.CharField(max_length=150)
    email     = models.EmailField(blank=True)
    telefone  = models.CharField(max_length=20, blank=True)
    whatsapp  = models.CharField(max_length=20, blank=True)
    cpf       = models.CharField(max_length=20, blank=True)
    principal = models.BooleanField(default=False)

    class Meta:
        ordering = ['-principal', 'nome']
        verbose_name = 'Sócio do Cliente'
        verbose_name_plural = 'Sócios do Cliente'

    def __str__(self):
        return f'{self.nome} — {self.cliente.nome_empresa}'
