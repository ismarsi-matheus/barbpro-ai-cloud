## Etapa 8 — LP moderna + Trial enforçado + Anti-fraude

### 1) Bug crítico: usuário novo abrindo /master/*

Investigar a causa real (provavelmente uma destas):
- O cache do React/router permitiu render antes do `beforeLoad` server-side rodar.
- O `handle_new_user` ainda promove usuários em alguns casos (ex.: app_config sem linha → cria com email do novo).
- `claim_super_admin_if_empty` foi chamado num momento em que `super_admin_emails` ficou vazio.

Correções:
- **Trigger `handle_new_user`**: remover qualquer promoção automática. Nunca mais promover ninguém via trigger. O super admin é semeado manualmente uma única vez.
- **RPC `claim_super_admin_if_empty`**: REMOVER. Não chamar mais do client. Risco de promover qualquer usuário se a tabela estiver vazia.
- **`use-auth.tsx`**: remover a chamada de `claim_super_admin_if_empty`. Apenas chamar `is_super_admin`.
- **`master.tsx` beforeLoad**: já valida via RPC, mas reforçar para não renderizar o componente até o check passar (state `verified`), evitando flash.
- **RLS de `user_roles`**: garantir que `INSERT/UPDATE/DELETE` sejam apenas via `service_role`. Nenhum usuário autenticado pode escrever.

### 2) Anti-fraude: CPF + telefone + email únicos

Nova tabela `trial_identity`:
- `cpf` (text, único, normalizado só dígitos)
- `phone` (text, único, normalizado E.164 só dígitos)
- `email` (text, único, lowercase)
- `user_id`, `company_id`, `created_at`

Regra: ao criar uma conta nova com trial, o sistema checa se `cpf` OU `phone` OU `email` já existe. Se sim, bloqueia: "Já existe uma conta com esses dados. Faça login ou contrate um plano."

Server fn `signupTrial({ email, password, cpf, phone, name })`:
- Valida CPF (dígitos verificadores), telefone (mínimo 10 dígitos), email.
- Checa `trial_identity` por conflito.
- Cria user via admin API, cria `company`, insere em `trial_identity`, cria `subscription` com `status='trialing'` e `trial_ends_at = now() + plan.trial_dias`.
- Retorna `{ ok, session }` para o client logar.

### 3) Trial: banner vermelho + contador + trava

- `subscription` já tem `trial_ends_at`. Garantir o campo.
- Componente `<TrialBanner />` no topo de `/app/*`: se `status='trialing'`, mostra barra vermelha fixa: "Período de teste — expira em X dias" (ou "hoje" / "expirado").
- `app.tsx` já redireciona pra `/app/checkout` em `inadimplente|cancelado|suspenso|trialExpired`. Reforçar `trialExpired` = `status='trialing' && trial_ends_at < now()`.
- Quando expirar, TODAS as rotas `/app/*` (exceto `/app/checkout` e `/app/configuracoes` se quiser) ficam travadas com tela: "Seu teste acabou. Escolha um plano pra continuar."
- Após pagamento (webhook já existente), `status` vira `ativo` e trava some.

### 4) LP moderna

Reescrever `src/routes/index.tsx`:
- **Hero**: 2 CTAs apenas — "Ver Planos" (scroll para `#planos`) e "Ver Demo" (abre `/agendar/demo` ou modal).
- **Seções**: hero / problema / features (3-4 cards de impacto: anti-no-show, comissões, comanda, clube de assinatura) / depoimentos curtos / **#planos** (3 cards do banco `plan`) / FAQ / footer.
- **Tom**: dark mode opcional, tipografia forte (Outfit + Inter via @fontsource), cores vivas com gradiente sutil. Não usar a estética padrão SaaS roxa.
- Todos os CTAs (menos "Ver Demo") fazem scroll suave até `#planos`.

### 5) Fluxo plano → email → login/signup → onboarding

Novo componente `<PlanCheckoutDialog />` aberto ao clicar num plano em `#planos`:
1. Passo 1 — pede email.
2. Server fn `checkEmailExists({ email })` retorna `{ exists: boolean }`.
3. Se existe → mostra campo senha → faz `signInWithPassword` → se ok, vai pra `/app/onboarding` com plano selecionado.
4. Se não existe → mostra form: nome, CPF, telefone, senha → chama `signupTrial` com o `plan_slug` escolhido → loga → redireciona pra `/app/onboarding`.
5. `/app/onboarding` já existe; só passar o plano via querystring/contexto.

### Arquivos

**Migration**:
- Remover/limpar `handle_new_user` (sem promoção) e dropar `claim_super_admin_if_empty`.
- Criar `trial_identity` com GRANTs + RLS (só service_role escreve; user lê o próprio).
- Adicionar índices únicos.
- Garantir RLS de `user_roles` (sem INSERT/UPDATE/DELETE pra authenticated).

**Server**:
- `src/lib/auth-signup.functions.ts` — `signupTrial`, `checkEmailExists`.
- `src/lib/auth-signup.server.ts` — validação CPF, normalização telefone, chamadas admin.

**Client**:
- `src/routes/index.tsx` — LP nova.
- `src/components/PlanCheckoutDialog.tsx`.
- `src/components/TrialBanner.tsx`.
- `src/hooks/use-auth.tsx` — remover `claim_super_admin_if_empty`.
- `src/routes/app.tsx` — montar `<TrialBanner />` + reforço `trialExpired`.
- `src/main.tsx` — fontes Outfit/Inter via @fontsource.

### Fora do escopo

- Reescrever `/agendar`, agenda, comandas (intactos).
- Tirar email automático de qualquer fluxo (já não tem).
- Mudar provedores de pagamento (webhook genérico já funciona).

### Validação ao terminar

- Build verde, typecheck verde.
- Criar conta nova de teste → não vê master, vê banner vermelho de trial.
- Tentar criar outra conta com mesmo CPF/telefone/email → bloqueada.
- Simular `trial_ends_at` no passado → trava + paywall.
