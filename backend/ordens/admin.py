from django.contrib import admin
from .models import OS, FaseOS, Contrato, Chamado, MensagemChamado

admin.site.register(OS)
admin.site.register(FaseOS)
admin.site.register(Contrato)
admin.site.register(Chamado)
admin.site.register(MensagemChamado)
