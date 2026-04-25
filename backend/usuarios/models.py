from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from .managers import UsuarioManager


class Usuario(AbstractBaseUser, PermissionsMixin):
    email     = models.EmailField(unique=True)
    nome      = models.CharField(max_length=150)
    ativo     = models.BooleanField(default=True)
    is_staff  = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

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
