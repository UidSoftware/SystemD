from django.db import models


class Cliente(models.Model):
    nome_empresa  = models.CharField(max_length=150)
    nome_contato  = models.CharField(max_length=150)
    email         = models.EmailField()
    telefone      = models.CharField(max_length=20)
    whatsapp      = models.CharField(max_length=20, blank=True)
    segmento      = models.CharField(max_length=50)
    cidade        = models.CharField(max_length=100, blank=True)
    estado        = models.CharField(max_length=2, blank=True)
    cnpj_cpf      = models.CharField(max_length=20, blank=True)
    origem        = models.CharField(max_length=50)
    observacoes   = models.TextField(blank=True)
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['-criado_em']

    def __str__(self):
        return self.nome_empresa
