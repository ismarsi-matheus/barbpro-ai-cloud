# Manual do Clonador — BarbeiroPro AI

Guia prático em pt-BR para colocar um novo SaaS de barbearia no ar a partir
deste projeto. O sistema é **multi-tenant**, **100% interno** (não envia
nenhum e-mail) e usa **TanStack Start + Lovable Cloud (Supabase)**.

---

## Passo 1 — Ativar o Lovable Cloud e rodar as migrations

1. No editor Lovable, abra o projeto clonado e ative o **Lovable Cloud**
   (backend gerenciado). Isso provisiona banco, auth e storage.
2. As migrations versionadas em `supabase/migrations/` rodam
   automaticamente. Confira no painel de Backend que as tabelas
   principais foram criadas:

   - `app_config` — nome do app, lista de super admins
   - `user_roles` — papéis globais (super_admin)
   - `company` — barbearia (tenant)
   - `company_user` — vínculo usuário↔empresa, role por empresa
   - `plan` — planos comerciais (editáveis pelo master)
   - `subscription` — assinatura por empresa
   - `billing_event_log` — log dos webhooks de cobrança
   - `professional`, `service`, `service_category`,
     `professional_service` — catálogo e equipe
   - `customer` — clientes da barbearia (com `fidelidade_contador`)
   - `appointment` — agenda (com `confirm_token`, `confirmed_at`)
   - `product` — produtos para venda na comanda
   - `sale`, `sale_item` — comandas (checkout interno)
   - `club_plan`, `club_member` — clube de assinatura recorrente
   - `financial_entry` — caixa
   - `invoice_simulated` — faturas simuladas

   Todas as tabelas de tenant têm **RLS** isolando por `company_id`
   via `has_company_access()`; tabelas globais (`plan`,
   `billing_event_log`) só são gerenciadas por super admin.

---

## Passo 2 — Virar Super Admin (Master)

O **primeiro e-mail** que se cadastrar em `/entrar` vira super admin
automaticamente — o trigger `handle_new_user` adiciona em `user_roles`
e em `app_config.super_admin_emails`.

Se outra pessoa cadastrou antes, recupere o acesso com este SQL no
Backend (substitua o e-mail):

```sql
-- 1) garante a role
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users
where lower(email) = lower('voce@exemplo.com')
on conflict do nothing;

-- 2) garante na lista do app_config
update public.app_config
   set super_admin_emails = array(
     select distinct lower(x)
     from unnest(coalesce(super_admin_emails, array[]::text[]) ||
                 array['voce@exemplo.com']) x
   ),
   updated_at = now();
```

Faça login e acesse `/master/painel`.

---

## Passo 3 — Personalizar a marca

Em `/master/configuracoes`:

- **Nome do app** e **e-mails super admin** → tabela `app_config`.
- **Cores e logo padrão** → tokens semânticos em `src/styles.css`
  (variáveis `--brand`, `--surface`, etc.) e ajustes em
  `src/components/brand.tsx`.
- Cada empresa também tem `primary_color`, `logo_url` e
  `nome_fantasia` próprios (override por tenant).

---

## Passo 4 — Criar os Planos comerciais

Em `/master/planos`:

- Crie/edite cada plano: `slug` (`starter` / `pro` / `business`),
  nome, preço (em centavos), dias de trial, limites
  (profissionais, clientes, agendamentos/mês), features (JSON com
  as flags de `src/lib/plan-features.ts`) e a **URL de checkout do
  provedor** (Kiwify, Cakto, PerfectPay, Hotmart ou Kirvano).
- O `slug` é a fonte da verdade para o gate de features. A matriz
  fica em `src/lib/plan-features.ts`.

---

## Passo 5 — Configurar os webhooks de checkout

Em `/master/configuracoes`, seção **Webhooks de cobrança**, há
**1 URL por provedor**, no formato:

```
{baseUrl}/api/public/billing/webhook?provider={provider}&token={token}
```

Provedores aceitos: `kiwify`, `cakto`, `perfectpay`, `hotmart`,
`kirvano`.

Como usar:

1. Copie a URL do provedor desejado (botão **Copiar**).
2. Cole no painel do provedor, na configuração de webhook (eventos
   de venda aprovada, reembolso e cancelamento).
3. Quando o cliente pagar, o webhook chega aqui, é validado por
   **token** + assinatura/normalização por provedor
   (`src/lib/billing/normalize.ts`), e a função em
   `src/lib/billing/apply.server.ts` **casa o pagamento pelo e-mail
   do comprador** com uma `company` existente — ativando a
   assinatura, escrevendo em `subscription` e logando em
   `billing_event_log`.
4. Se o token vazar, clique **Regenerar token** — a URL antiga
   deixa de funcionar imediatamente, gere uma nova no provedor.

Tudo é **server-side**, em `src/routes/api/public/billing/webhook.ts`
(rota pública sem auth, protegida por token + assinatura).

---

## Passo 6 — Criar a primeira barbearia (cliente)

Em `/master/novaBarbearia`:

- Preencha dados da empresa, escolha o plano e defina o **e-mail e
  a senha** do dono (ou clique **Gerar senha**).
- Ao salvar, a tela mostra um card **“Acesso pronto”** com e-mail
  + senha e botões **Copiar**. **Nenhum e-mail é enviado** — você
  passa as credenciais para o cliente pelo canal que preferir
  (WhatsApp, voz, etc.).
- O cliente entra em `/entrar`, e na primeira vez é levado para
  `/trocar-senha` (flag `forcar_troca_senha` no `company_user`).

O mesmo padrão vale para reset: em `/master/listaBarbearias`,
**Resetar senha** gera nova senha e mostra na tela.

---

## Passo 7 — Guia rápido das telas do cliente (`/app`)

- **Dashboard** (`/app/dashboard`) — KPIs do dia, MRR do clube
  quando houver assinantes.
- **Agenda** (`/app/agenda`) — calendário, criar agendamento,
  marcar **falta** (no-show), atalho para lembretes e abrir
  comanda do agendamento.
- **Comandas** (`/app/comandas`) — fechar atendimento com
  serviços + produtos, aplicar desconto, escolher forma de
  pagamento. A RPC `close_sale` calcula comissão por
  profissional, baixa estoque, grava no caixa e incrementa
  fidelidade.
- **Produtos** (`/app/produtos`) — cadastro, preço, estoque.
- **Profissionais** (`/app/profissionais`) — cadastro com
  **% de comissão** padrão (e override por serviço em
  `professional_service`).
- **Clientes** (`/app/clientes`) — base, progresso da
  **fidelidade** (ex.: `7/10 🎁`) e botão **Resgatar prêmio**.
- **Lembretes** (`/app/lembretes`) — lista de hoje/amanhã com
  link **WhatsApp 1-clique** (`wa.me`) anti-no-show, incluindo
  link de confirmação `/confirmar/{token}`. Gate:
  `lembretesWhatsapp`.
- **Clube** (`/app/clube`) — planos recorrentes e membros.
  Gate: `clubeAssinatura`.
- **Relatórios** (`/app/relatorios`) — faturamento, ticket
  médio, ranking por profissional, no-show e **comissões a
  pagar** (CSV). Avançados gateados por `relatoriosAvancados`.
- **Equipe** (`/app/equipe`) — criar usuários internos
  (recepção/barbeiro). A senha aparece em modal **“Acesso
  pronto”**. Nada de convite por e-mail.
- **Configurações** (`/app/configuracoes`) — dados da empresa,
  cobrança, **Fidelidade** (meta + prêmio).

---

## Passo 8 — Planos × Funcionalidades

Matriz em `src/lib/plan-features.ts`:

| Feature              | Starter | Pro | Business |
|----------------------|:------:|:---:|:--------:|
| multiprofissional    |   ✗    |  ✓  |    ✓     |
| comissoes            |   ✗    |  ✓  |    ✓     |
| financeiro           |   ✗    |  ✓  |    ✓     |
| relatoriosAvancados  |   ✗    |  ✓  |    ✓     |
| fidelidade           |   ✗    |  ✓  |    ✓     |
| lembretesWhatsapp    |   ✗    |  ✓  |    ✓     |
| clubeAssinatura      |   ✗    |  ✗  |    ✓     |
| apiWebhooks          |   ✗    |  ✗  |    ✓     |

Use sempre `featureEnabled(company.selected_plan_slug, 'chave')`
para gatear UI/serverFn.

---

## FAQ

**Como adicionar outro super admin?**
Em `/master/configuracoes`, adicione o e-mail em
**Super Admins** (vai pra `app_config.super_admin_emails`) e/ou
rode o SQL do Passo 2.

**Como o cliente troca a senha?**
Ele entra em `/entrar` com a senha provisória; o sistema redireciona
para `/trocar-senha`. A qualquer momento, em
`/app/configuracoes`, pode trocar de novo. Esqueceu? O dono da
barbearia reseta em `/app/equipe`, ou o master reseta em
`/master/listaBarbearias`.

**Posso revender / clonar para outro nicho?**
Sim. Personalize marca (Passo 3), planos (Passo 4) e os textos das
telas. O código é seu.

---

## O que NÃO depende de e-mail

**Tudo.** Não há integração SMTP/Resend/SendGrid. Criação de conta,
convite de equipe e reset de senha mostram credenciais na tela.

## Lembrete de WhatsApp não é automático

O envio é **manual em 1 clique**, abrindo `wa.me` com a mensagem
pronta. Não há API de WhatsApp Business conectada — isso facilita
clonar sem custo/fricção, e quem quiser pode plugar depois.
