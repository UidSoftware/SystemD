from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from .managers import UsuarioManager


class Setor(models.Model):
    nome      = models.CharField(max_length=100)
    descricao = models.CharField(max_length=255, blank=True)
    ativo     = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Setor'
        verbose_name_plural = 'Setores'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Perfil(models.TextChoices):
    ADMIN       = 'ADMIN',       'Administrador'
    FINANCEIRO  = 'FINANCEIRO',  'Financeiro'
    OPERACIONAL = 'OPERACIONAL', 'Operacional'
    CLIENTE     = 'CLIENTE',     'Cliente'


class Usuario(AbstractBaseUser, PermissionsMixin):
    email     = models.EmailField(unique=True)
    nome      = models.CharField(max_length=150)
    ativo     = models.BooleanField(default=True)
    is_staff  = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    perfil    = models.CharField(max_length=20, choices=Perfil.choices, default=Perfil.OPERACIONAL)
    setor     = models.ForeignKey(Setor, null=True, blank=True, on_delete=models.SET_NULL, related_name='usuarios')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    objects = UsuarioManager()

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.email

    @property
    def is_active(self):
        return self.ativo


class UsuarioEmailConfig(models.Model):
    usuario       = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='email_config')
    email_conta   = models.EmailField()
    email_senha   = models.CharField(max_length=255)
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuração de Email'
        verbose_name_plural = 'Configurações de Email'

    def __str__(self):
        return f'{self.usuario.email} → {self.email_conta}'
