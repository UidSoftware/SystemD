from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import OS, FaseOS


@receiver(post_save, sender=OS)
def registrar_fase_ao_salvar(sender, instance, created, **kwargs):
    if created:
        FaseOS.objects.create(
            os=instance,
            fase=instance.status,
            responsavel=instance.responsavel,
            descricao='OS criada.',
        )
