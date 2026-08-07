# Plano de Execução — Esteira em Fila (Manutenção-Kanban + Artefatos)

Documento de planejamento pra retomar amanhã. Segue o mesmo padrão de
`Instrucao_Claude_Code_FaseX.md` que já existe neste repo (e no Studio
Fluir, o sistema que começou tudo isso) — ler este arquivo no início da
sessão e implementar a partir daqui.

**Origem:** retrospectiva do trabalho de 05-06/08/2026 (Manutenções #15,
21-24 do UidCore). Achados que motivam essa mudança:

```
1. Cada troca de agente (Planner→Analista→Forge→Loom→Sentinel→Pilot)
   e uma sessao de topo isolada, sem memoria da anterior — 1.469.219
   tokens em "cache creation" num unico dia so de releitura de contexto.
2. Sessao unica orquestrando tudo fica vulneravel a rate limit matando
   a cadeia INTEIRA no meio — aconteceu 3x no mesmo dia, um processo
   ficou 7h preso sem fazer nada apos a sessao "terminar" sem o SO
   perceber.
3. Cron e trabalho manual nao se enxergam — cron disparou Planner
   completo em paralelo com correcao manual em andamento pras
   Manutencoes #23 e #24, gastando $4,40 em trabalho redundante
   (ja corrigido hoje com processo_ativo_para_caminho() — ver CLAUDE.md
   global, secao "Cron pode duplicar trabalho que ja esta sendo feito
   na mao").
4. Projeto pre-esteira (Studio Fluir) ficou 5-6 semanas com um proximo
   passo planejado e pronto, travado esperando reuniao humana, sem
   NINGUEM (nem sistema nem humano) sinalizando isso — porque nunca
   virou Manutencao no banco.
5. Notificacao IMPEDIMENTO_ESTEIRA e passiva (so grava linha no banco,
   sem push/email/whatsapp) — se ninguem abrir a tela, fica invisivel.
```

**Princípio norteador (do usuário, 06/08/2026):** "não quero que o
sistema funcione sozinho [dependendo de mim vigiar] — numa fábrica o
dono não está lá." Alarme humano é o ÚLTIMO recurso, não o mecanismo
principal. O sistema tem que tentar se autocorrigir e continuar
avançando sozinho sempre que a decisão não for genuinamente humana
(aprovação comercial, escolha de escopo, etc.).

---

## 1. Ideia central

Hoje uma única sessão do Planner orquestra a esteira inteira, viva do
início ao fim, chamando os outros agentes via Bash e esperando cada um
terminar. Isso significa: se a sessão do Planner morre (rate limit,
timeout, o que for), a Manutenção inteira trava no meio, mesmo que
partes dela já tenham sido feitas e commitadas.

**Nova ideia:** quebrar a orquestração em 6 estágios independentes,
cada um disparado pelo SEU PRÓPRIO cron, que só faz uma coisa: pegar
Manutenções na etapa certa, processar, avançar a etapa, e morrer. Nada
fica esperando horas. Se uma etapa falhar, só ela precisa ser refeita —
o que já foi feito nas etapas anteriores continua salvo (artefatos +
commits).

Isso cria uma fila real (Kanban) em vez de uma esteira monolítica.
Manutenções diferentes podem estar em etapas diferentes ao mesmo tempo
sem conflito — inclusive permite paralelismo real ENTRE manutenções
(coisa que a esteira de sessão única nunca teve).

---

## 2. Modelo de dados

### 2.1 `Manutencao` — vira o card do Kanban

Campos novos a adicionar (migration):

```python
class EtapaManutencao(models.TextChoices):
    PENDENTE          = 'PENDENTE', 'Pendente'
    ORDEM_CRIADA       = 'ORDEM_CRIADA', 'Ordem criada (Planner)'
    ESPEC_CRIADA        = 'ESPEC_CRIADA', 'Especificação criada (Analista)'
    BACKEND_PRONTO      = 'BACKEND_PRONTO', 'Backend pronto (Forge)'
    FRONTEND_PRONTO     = 'FRONTEND_PRONTO', 'Frontend pronto (Loom)'
    SENTINEL_APROVADO   = 'SENTINEL_APROVADO', 'Aprovado pelo Sentinel'
    SENTINEL_REPROVADO  = 'SENTINEL_REPROVADO', 'Reprovado pelo Sentinel'
    DEPLOYADO           = 'DEPLOYADO', 'Deployado (Pilot)'
    BLOQUEADA           = 'BLOQUEADA', 'Bloqueada — precisa de decisão humana'

# Novos campos em Manutencao:
etapa            = models.CharField(max_length=20, choices=EtapaManutencao.choices,
                                     default=EtapaManutencao.PENDENTE)
etapa_atualizada_em = models.DateTimeField(auto_now=True)
bloqueio_motivo  = models.TextField(blank=True)   # ex: "aguardando aprovacao comercial"
bloqueada_em     = models.DateTimeField(null=True, blank=True)
tentativas_etapa = models.PositiveSmallIntegerField(default=0)  # reseta a cada troca de etapa
```

`feito` e `disparada_em` continuam existindo por compatibilidade (nada
que já usa esses campos quebra), mas passam a ser DERIVADOS da etapa:
`feito = (etapa == DEPLOYADO)`. Considerar deprecar `disparada_em` no
sentido antigo — quem importa agora é `etapa` + `etapa_atualizada_em`
(serve pro watchdog de "silêncio prolongado" também: etapa parada há
muito tempo sem avançar = sinal de alerta).

### 2.2 `Artefato` — novo model

```python
class TipoArtefato(models.TextChoices):
    ORDEM           = 'ORDEM', 'Ordem (Planner)'
    ESPEC_FUNCIONAL = 'ESPEC_FUNCIONAL', 'Especificação funcional (Analista)'
    ESPEC_UI        = 'ESPEC_UI', 'Especificação de UI (Brush)'
    RELATORIO_QA    = 'RELATORIO_QA', 'Relatório de QA (Sentinel)'
    RELATORIO_DEPLOY = 'RELATORIO_DEPLOY', 'Relatório de deploy (Pilot)'

class Artefato(models.Model):
    manutencao  = models.ForeignKey(Manutencao, on_delete=CASCADE, related_name='artefatos')
    tipo        = models.CharField(max_length=20, choices=TipoArtefato.choices)
    conteudo    = models.TextField()       # markdown, mesmo conteudo que hoje vai pro
                                            # Especificacao_Hotfix.md etc — aqui fica no banco
                                            # tambem, pra nao depender so do arquivo no repo
    caminho_arquivo = models.CharField(max_length=500, blank=True)  # path no repo, se salvo la tambem
    criado_por  = models.CharField(max_length=20)  # nome do agente que gerou
    criado_em   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['criado_em']
```

Continuar salvando os arquivos `.md` no repo do projeto (já é assim,
não quebrar esse padrão — Forge/Loom leem de lá) — o model `Artefato`
é a versão *consultável* dos mesmos artefatos pro Kanban mostrar sem
precisar dar `git show`/SSH toda vez.

### 2.3 `Notificacao` — não morre, mas encolhe de escopo

`IMPEDIMENTO_ESTEIRA` deixa de ser criada como Notificação — vira
`Manutencao.etapa = BLOQUEADA` + `bloqueio_motivo` preenchido. Os
outros tipos (`STACK_FORA_PADRAO`, `LEAD_NAO_QUALIFICADO`,
`PRONTO_PARA_PLANNER`, `LIMITE_CLAUDE_ATIVO`) continuam existindo —
são do Fluxo 1 (Novo Lead), não têm Manutenção equivalente ainda.

---

## 3. As 6 etapas / os 6 crons

Cada cron é um script Python em `/opt/uid-automation/`, rodando via
crontab, seguindo o MESMO padrão de `disparar_hotfix.py` (idempotente,
`processo_ativo_para_caminho()` como trava, log em `/root/esteira-logs/`).
Sugestão: um único script `disparar_etapa.py --etapa=<nome>` parametrizado,
6 entradas de crontab chamando ele com etapa diferente, em vez de 6
arquivos duplicados — menos código pra manter.

| # | Cron | Pega etapa | Roda agente | Avança pra | Timeout sugerido |
|---|------|-----------|--------------|-----------|-------------------|
| 1 | Planner | `PENDENTE` | Planner (só cria a ordem, NÃO implementa) | `ORDEM_CRIADA` | 15min |
| 2 | Analista | `ORDEM_CRIADA` | Analista (+ Brush se UI) | `ESPEC_CRIADA` | 30min |
| 3 | Forge | `ESPEC_CRIADA` | Forge | `BACKEND_PRONTO` | 60min |
| 4 | Loom | `BACKEND_PRONTO` | Loom | `FRONTEND_PRONTO` | 60min |
| 5 | Sentinel | `FRONTEND_PRONTO` | Sentinel | `SENTINEL_APROVADO` ou `SENTINEL_REPROVADO` | 45min |
| 6 | Pilot | `SENTINEL_APROVADO` | Pilot | `DEPLOYADO` | 30min |

`SENTINEL_REPROVADO` volta pra `ESPEC_CRIADA` (Forge/Loom recebem o
relatório do Sentinel como parte do próximo disparo) — não cria etapa
nova, só devolve pro início da implementação com o relatório anexado
como Artefato.

Cada cron roda a cada 15min (igual `sync_skills`/`generate_agents` já
fazem) — como cada etapa só processa o que está NA SUA coluna, não tem
disparo redundante entre etapas diferentes.

---

## 4. Retry inteligente (rate limit ≠ falha real)

Hoje: 3 tentativas sem distinguir motivo. Se as 3 caírem na mesma
janela de rate limit de 5h, a Manutenção é dada como "excedeu
tentativas" sem nunca ter tido uma chance real.

**Mudança em `disparar_etapa.py` (reconciliação):** ao detectar que um
processo morreu sem concluir a etapa, ler o log e checar o último
evento `rate_limit_event`:
- Se o motivo foi rate limit (`status: rejected`) → NÃO conta como
  tentativa. Guardar `resetsAt` e só liberar a Manutenção pra novo
  disparo depois desse horário (não no próximo tick imediato).
- Se foi qualquer outro erro (bug, timeout de verdade, crash) → conta
  como tentativa normalmente, mesma lógica de hoje (3 tentativas → etapa
  vira `BLOQUEADA` com motivo automático).

---

## 5. Matrícula automática de projetos legados

Cron adicional (`auditar_projetos_orfaos.py`, roda 1x/dia): pra cada
`OS.ativo=True` com `caminho_servidor` preenchido, ler o `CLAUDE.md` do
projeto procurando um padrão tipo "Próximo passo planejado" / "Status:
aguardando" que não tenha `Manutencao` correspondente aberta. Se achar,
CRIAR a Manutenção sozinho (etapa=PENDENTE ou BLOQUEADA se o próprio
texto já disser "aguardando decisão/reunião humana").

Isso pega o caso Studio Fluir automaticamente, e qualquer projeto
futuro que tenha o mesmo padrão de "anotei mas ninguém matriculou".

**Padrão a definir**: convencionar uma seção fixa no CLAUDE.md de todo
projeto (ex: `## Próximo Passo Planejado`) que esse cron sabe procurar
— hoje é texto livre, não dá pra parsear de forma confiável sem um
formato mínimo combinado.

---

## 6. UI — Office

Dentro do Office, deixar só duas telas:

1. **Kanban de Manutenção** — colunas = `EtapaManutencao` (menos
   `BLOQUEADA`, que aparece como uma faixa/destaque separado no topo,
   tipo "precisa de você" — já que é literalmente o único ponto que
   exige humano por definição). Card = número, sistema (OS), descrição
   resumida. Clique no card → modal/página de detalhe com: todos os
   Artefatos vinculados, histórico de mudança de etapa, motivo de
   bloqueio (se houver), botão de ação só quando `BLOQUEADA` (ex:
   "Aprovar e liberar").
2. **Artefatos** — lista/busca de todos os Artefatos gerados, filtrável
   por Manutenção/tipo/agente. Serve de auditoria e de "o que cada
   agente realmente produziu" sem precisar abrir SSH.

Tela de Notificações atual (a parte que hoje é só IMPEDIMENTO_ESTEIRA)
pode sair do Office — mescla no Kanban via `BLOQUEADA`.

---

## 7. Ordem de implementação sugerida (amanhã)

```
1. Migration: campos novos em Manutencao (etapa, etapa_atualizada_em,
   bloqueio_motivo, bloqueada_em, tentativas_etapa) + model Artefato novo.
   Rodar makemigrations LOCAL (nunca na VPS, regra padrao).
2. Estender disparar_hotfix.py (management command) com:
   --listar-etapa <etapa>  (substitui --list, filtra por etapa em vez
                             de feito/disparada_em)
   --avancar-etapa <id> <etapa_nova>
   --bloquear <id> "<motivo>"
   --salvar-artefato <id> --tipo=X --conteudo=@arquivo
3. Escrever disparar_etapa.py (script novo em /opt/uid-automation/),
   parametrizado por --etapa, reaproveitando processo_ativo_para_caminho()
   e a logica de reconciliacao/retry ja existente em disparar_hotfix.py
   (extrair pra um modulo comum se fizer sentido, evitar duplicar).
4. Testar com 1 Manutencao de mentira ponta a ponta, etapa por etapa,
   ANTES de ligar os 6 crons de verdade — validar cada estagio isolado.
5. Ligar os 6 crons no crontab (15 em 15 min cada, staggered pra nao
   competir por recurso: :00,:15,:30,:45 escalonado entre os 6).
6. Cron de retry inteligente (secao 4) — pode vir junto do passo 3,
   e' a mesma logica de reconciliacao.
7. So DEPOIS de 1-6 estarem rodando estavel: UI do Kanban (secao 6).
8. So DEPOIS disso: cron de matricula automatica de projetos orfaos
   (secao 5) — depende do Kanban existir pra fazer sentido visualmente.
```

---

## 8. Decisões em aberto (confirmar durante a implementação, não travar o início por causa delas)

```
- Nome exato dos scripts/crons — os daqui sao sugestao, pode ajustar.
- Formato exato da secao "Proximo Passo Planejado" no CLAUDE.md pro
  scan automatico conseguir parsear (secao 5).
- Se Analista+Brush sao a MESMA etapa (ESPEC_CRIADA) ou se Brush vira
  uma etapa propria — no fluxo de hoje eles ja rodam em sequencia mas
  dentro do mesmo "estagio" logico. Sugestao inicial: mesma etapa,
  Analista chama Brush internamente se o Planner marcou que tem UI
  envolvida.
- O que fazer com Manutencoes #12 (caminho nao existe, conhecido desde
  antes) e as de teste (#16-20, criadas validando a integracao API Key)
  quando o novo esquema entrar — provavelmente so marcar ativo=False
  nelas, nao apagar (auditoria).
```
