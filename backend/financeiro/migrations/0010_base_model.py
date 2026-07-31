from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('financeiro', '0009_receita_financeira'),
    ]

    operations = [
        # ── Categoria: era models.Model puro com ativo/criado_em soltos ──
        migrations.RenameField(model_name='categoria', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='categoria', old_name='criado_em', new_name='created_at'),
        migrations.AlterField(
            model_name='categoria', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='categoria', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AddField(
            model_name='categoria', name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now, verbose_name='atualizado em'),
            preserve_default=False,
        ),

        # ── Conta ──
        migrations.RenameField(model_name='conta', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='conta', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='conta', old_name='atualizado_em', new_name='updated_at'),
        migrations.RenameField(model_name='conta', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='conta', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='conta', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AlterField(
            model_name='conta', name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='atualizado em'),
        ),

        # ── Aporte ──
        migrations.RenameField(model_name='aporte', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='aporte', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='aporte', old_name='atualizado_em', new_name='updated_at'),
        migrations.RenameField(model_name='aporte', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='aporte', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='aporte', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AlterField(
            model_name='aporte', name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='atualizado em'),
        ),

        # ── Receita ──
        migrations.RenameField(model_name='receita', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='receita', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='receita', old_name='atualizado_em', new_name='updated_at'),
        migrations.RenameField(model_name='receita', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='receita', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='receita', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AlterField(
            model_name='receita', name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='atualizado em'),
        ),
        migrations.AlterField(
            model_name='receita', name='categoria',
            field=models.ForeignKey(
                blank=True, null=True,
                limit_choices_to={'tipo': 'ENTRADA', 'is_active': True},
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='receitas', to='financeiro.categoria',
            ),
        ),

        # ── Despesa ──
        migrations.RenameField(model_name='despesa', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='despesa', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='despesa', old_name='atualizado_em', new_name='updated_at'),
        migrations.RenameField(model_name='despesa', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='despesa', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='despesa', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AlterField(
            model_name='despesa', name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='atualizado em'),
        ),
        migrations.AlterField(
            model_name='despesa', name='categoria',
            field=models.ForeignKey(
                blank=True, null=True,
                limit_choices_to={'tipo': 'SAIDA', 'is_active': True},
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='despesas', to='financeiro.categoria',
            ),
        ),

        # ── Fornecedor (forn_ativo NAO muda, e campo distinto) ──
        migrations.RenameField(model_name='fornecedor', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='fornecedor', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='fornecedor', old_name='atualizado_em', new_name='updated_at'),
        migrations.RenameField(model_name='fornecedor', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='fornecedor', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='fornecedor', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AlterField(
            model_name='fornecedor', name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='atualizado em'),
        ),

        # ── ConciliacaoExtrato ──
        migrations.RenameField(model_name='conciliacaoextrato', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='conciliacaoextrato', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='conciliacaoextrato', old_name='atualizado_em', new_name='updated_at'),
        migrations.RenameField(model_name='conciliacaoextrato', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='conciliacaoextrato', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='conciliacaoextrato', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AlterField(
            model_name='conciliacaoextrato', name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='atualizado em'),
        ),

        # ── PadraoSeguroConciliacao: era models.Model puro ──
        migrations.RenameField(model_name='padraoseguroconciliacao', old_name='ativo', new_name='is_active'),
        migrations.RenameField(model_name='padraoseguroconciliacao', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='padraoseguroconciliacao', old_name='criado_por', new_name='created_by'),
        migrations.AlterField(
            model_name='padraoseguroconciliacao', name='is_active',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
        migrations.AlterField(
            model_name='padraoseguroconciliacao', name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='criado em'),
        ),
        migrations.AddField(
            model_name='padraoseguroconciliacao', name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now, verbose_name='atualizado em'),
            preserve_default=False,
        ),

        # ── LivroCaixa: continua models.Model puro (imutavel, sem is_active) ──
        migrations.RenameField(model_name='livrocaixa', old_name='criado_em', new_name='created_at'),
        migrations.RenameField(model_name='livrocaixa', old_name='criado_por', new_name='created_by'),
        migrations.AlterModelOptions(
            name='livrocaixa',
            options={'ordering': ['-data', '-created_at']},
        ),
    ]
