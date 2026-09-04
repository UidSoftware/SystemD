from django.db import models


class Nicho(models.Model):
    """Tabela única de nichos/segmentos de negócio, compartilhada por
    Cliente, Prospecto e Entrevista — evita cada cadastro guardar o mesmo
    conceito como texto livre divergente (achado real: "transporte" e
    "Transporte" já existiam como valores diferentes em Cliente.segmento
    antes desta tabela existir, 30/08/2026)."""
    nome      = models.CharField(max_length=100, unique=True)
    ativo     = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Nicho'
        verbose_name_plural = 'Nichos'
        ordering = ['nome']

    def __str__(self):
        return self.nome
