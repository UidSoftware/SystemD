# CLAUDE.md — Sistema Interno Uid Software

## Projeto
Sistema interno da **Uid Software e Tecnologia LTDA**  
Fundador: Luiz Eduardo Gonçalves Ferreira  
CNPJ: 60.939.393/0001-25 | Micro Empresa | Simples Nacional  
Sede: Uberlândia/MG | Operação: 100% digital/remota

## Stack
- **Backend:** Python 3.12 + Django 5.x + Django REST Framework
- **Frontend:** React 18 + Vite + Tailwind CSS + Axios + React Router v6
- **Banco:** PostgreSQL 16
- **Infra:** VPS Ubuntu 24.04 + Docker Compose + Nginx + Gunicorn

## Regras críticas
- Nunca SQLite — sempre PostgreSQL
- Nunca `FloatField` para dinheiro — sempre `DecimalField`
- Nunca hardcodar credenciais — sempre `.env`
- Nunca `response.data` direto em listas — sempre `response.data.results` (paginação DRF)
- Nunca comitar `.env`
- Soft delete em models futuros: `ativo = BooleanField(default=True)`
- `DEBUG=False` em produção

## Estrutura
```
SytemD/
├── backend/        ← Django (core + vitrine)
├── frontend/       ← React + Vite
├── nginx/          ← config Nginx
├── docker-compose.yml        ← dev
├── docker-compose.prod.yml   ← produção
├── .env.example
└── Makefile
```

## Comandos
```bash
make dev            # sobe ambiente dev
make build          # build produção
make test           # roda testes Django
make migrate        # aplica migrations
make logs           # tail logs containers
make shell          # shell Django
```

## Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| **Fase 1** | Setup + Vitrine Pública | 🔄 Em execução |
| Fase 2 | Autenticação + Cadastro de Clientes | ⏳ Aguardando |
| Fase 3 | Contratos + Mensalidades | ⏳ Aguardando |
| Fase 4 | Projetos + Fases | ⏳ Aguardando |
| Fase 5 | Financeiro + Dashboard | ⏳ Aguardando |
| Fase 6 | Form de Levantamento de Requisitos | ⏳ Aguardando |

## Fase 1 — Checklist
- [x] Estrutura de pastas criada
- [x] docker-compose.yml dev
- [x] docker-compose.prod.yml
- [x] .env.example
- [x] Makefile
- [x] nginx.conf
- [ ] make dev sobe sem erro
- [x] Model Lead criado e registrado no admin
- [x] Endpoint POST /api/leads/ funcionando
- [x] Componentes Hero, Sobre, Portfolio, Contato
- [x] Formulário conectado à API
- [ ] Vitrine responsiva (testado em mobile)
- [ ] make test passa
