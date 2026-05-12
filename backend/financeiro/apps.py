from django.apps import AppConfig


class FinanceiroConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    # Ajuste 'apps.financeiro' para o caminho real do app no seu projeto.
    # Exemplo: 'myproject.financeiro' ou simplesmente 'financeiro'
    name = 'financeiro'
    verbose_name = 'Financeiro'

    def ready(self):
        import financeiro.signals  # noqa: F401
