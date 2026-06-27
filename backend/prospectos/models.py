from django.db import models


class Prospecto(models.Model):
    lead = models.ForeignKey(
        'vitrine.Lead',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='prospectos',
    )

    nome_empresa  = models.CharField(max_length=150)
    segmento      = models.CharField(max_length=50, blank=True)
    cidade        = models.CharField(max_length=100, blank=True)
    estado        = models.CharField(max_length=2, blank=True)
    cnpj_cpf      = models.CharField(max_length=20, blank=True)
    origem        = models.CharField(max_length=50, blank=True)
    observacoes   = models.TextField(blank=True)

    responsavel = models.ForeignKey(
        'usuarios.Usuario',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='prospectos_responsavel',
    )
    convertido    = models.BooleanField(default=False)
    convertido_em = models.DateTimeField(null=True, blank=True)
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Prospecto'
        verbose_name_plural = 'Prospectos'
        ordering = ['-criado_em']

    def __str__(self):
        return self.nome_empresa


class SocioProspecto(models.Model):
    prospecto = models.ForeignKey(Prospecto, on_delete=models.CASCADE, related_name='socios')
    nome      = models.CharField(max_length=150)
    email     = models.EmailField(blank=True)
    telefone  = models.CharField(max_length=20, blank=True)
    whatsapp  = models.CharField(max_length=20, blank=True)
    cpf       = models.CharField(max_length=20, blank=True)
    principal = models.BooleanField(default=False)

    class Meta:
        ordering = ['-principal', 'nome']
        verbose_name = 'Sócio do Prospecto'
        verbose_name_plural = 'Sócios do Prospecto'

    def __str__(self):
        return f'{self.nome} — {self.prospecto.nome_empresa}'
