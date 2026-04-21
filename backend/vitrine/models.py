from django.db import models


class Lead(models.Model):
    nome = models.CharField(max_length=100)
    email = models.EmailField()
    telefone = models.CharField(max_length=20, blank=True)
    empresa = models.CharField(max_length=100, blank=True)
    mensagem = models.TextField()
    origem = models.CharField(max_length=50)
    criado_em = models.DateTimeField(auto_now_add=True)
    lido = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Lead'
        verbose_name_plural = 'Leads'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.nome} — {self.email}'
