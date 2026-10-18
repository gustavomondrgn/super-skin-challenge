# Super Skin Challenge

Site do evento entre **isinha, alice, kurtz e musashi**, com classificação, confrontos e administração dos resultados. React + TypeScript + Vite, com Supabase para acesso, armazenamento e atualizações ao vivo. Publicação na Vercel, usando o endereço gratuito `vercel.app`.

## Formato do evento

- **Fase 1:** todos contra todos em MD3. Quatro pessoas geram **6 confrontos**, e cada pessoa disputa 3.
- **Classificação:** confrontos vencidos → rounds ganhos → MD1 extra em empate absoluto. Os rounds dos desempates não alteram os totais da fase regular.
- **Fase 2:** os dois primeiros disputam uma MD5. O vencedor garante a Phantom Champions 2026.
- **Fase 3:** o campeão enfrenta Zacarias em MD3. Se vencer, leva o pacote completo; a Phantom continua garantida se perder.
- **Faca ou punição:** encerra apenas a partida atual; vencedor recebe 10 rounds oficiais e perdedor mantém seu placar real.

O regulamento completo está em [contexto_brutal_super_skin_challenge_v1_1.md](./contexto_brutal_super_skin_challenge_v1_1.md). A conversa posterior definiu os quatro participantes acima e excluiu os rounds extras da soma da fase regular.

O painel é acessado diretamente por `/admin`; a página pública não mostra links de administração. Em cada confronto, **Sortear mapa** escolhe um dos cinco mapas de duelo (A, B, C, D ou E) para toda a série e salva o resultado. Mapas podem se repetir entre sorteios. **Sortear novamente** pede confirmação antes de substituir o mapa. Os dados antigos continuam compatíveis; não é necessário executar um novo SQL.

São **8 confrontos no evento inteiro**, sem contar desempates: 6 na primeira fase, a final e o desafio. Isso representa de **17 a 26 partidas**, então o formato não garante duração inferior a uma hora. O tempo depende da duração de cada partida e dos intervalos.

## 1. Preparar o Supabase

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e crie um projeto chamado `super-skin-challenge`. Escolha **South America / São Paulo**, se disponível, e guarde a senha do banco.
2. Quando o projeto estiver pronto, abra **SQL Editor → New query**.
3. Copie o conteúdo completo de [supabase/setup.sql](./supabase/setup.sql), cole no editor e execute com **Run**. Ele cria as tabelas, as permissões e a transmissão ao vivo. Pode executá-lo novamente sem apagar os resultados.
4. Em **Authentication → Users → Add user → Create new user**, cadastre seu e-mail e uma senha. Marque **Auto Confirm User**, se essa opção aparecer. A conta precisa estar confirmada para entrar no painel.
5. Em **Authentication → Sign In / Providers**, mantenha o provedor **Email** habilitado e desative **Allow new users to sign up**. Mantenha o login anônimo desativado. O público acompanha o evento sem criar conta.
6. Volte ao **SQL Editor** e execute o bloco abaixo, trocando `SEU_EMAIL_AQUI` pelo mesmo e-mail do passo 4:

```sql
do $$
declare
  admin_user_id uuid;
begin
  select id into admin_user_id
  from auth.users
  where lower(email) = lower('SEU_EMAIL_AQUI')
    and email_confirmed_at is not null;

  if admin_user_id is null then
    raise exception 'Usuário não encontrado ou e-mail não confirmado. Crie/confirme a conta em Authentication → Users e tente novamente.';
  end if;

  insert into public.event_admins (user_id)
  values (admin_user_id)
  on conflict (user_id) do nothing;
end;
$$;
```

7. Na página inicial do projeto, clique no botão de copiar ao lado da URL, abaixo do nome do projeto. Use **Copy Project URL** e **Copy Publishable key**. Esses valores também aparecem no fluxo **Connect** e na área **API Keys**. Você usará os dois valores na Vercel:

| Variável | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL `https://…supabase.co` do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública que começa com `sb_publishable_…` |

A chave publishable foi feita para uso no navegador. Quem pode editar é definido pelo login e pelas políticas do banco. **Não use a senha do banco, `service_role` ou uma secret key no site.** Não é necessário configurar Storage, Edge Functions ou uma integração adicional com a Vercel. [Referência: chaves do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## 2. Publicar na Vercel

O código precisa estar no [repositório do projeto](https://github.com/gustavomondrgn/super-skin-challenge) antes da importação.

1. Entre em [vercel.com/new](https://vercel.com/new), conecte seu GitHub e importe `gustavomondrgn/super-skin-challenge`.
2. Confira as configurações:

| Campo | Valor |
| --- | --- |
| Framework Preset | **Vite** |
| Root Directory | Raiz do repositório (`./`) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. Em **Environment Variables**, adicione as duas variáveis da tabela anterior. Ative para **Production** e **Preview** se quiser que os testes de publicação usem o mesmo evento.
4. Clique em **Deploy**. A Vercel fornecerá um endereço HTTPS em `vercel.app`; nenhum domínio próprio é necessário.
5. No Supabase, em **Authentication → URL Configuration**, defina **Site URL** com o endereço de produção da Vercel. O login por e-mail e senha deste site não depende de redirecionamento. Se futuramente adicionar links de confirmação ou recuperação, cadastre também as URLs de retorno correspondentes.
6. Abra `https://SEU-PROJETO.vercel.app/admin` e entre com a conta criada no Supabase.

Os resultados são salvos no Supabase; **lançar ou corrigir placar não exige novo deploy**. Alterações de código enviadas à branch de produção configurada na Vercel geram novas publicações. Se alterar as variáveis de ambiente, faça um novo deploy para incorporá-las ao build. [Referências: Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite), [variáveis de ambiente](https://vercel.com/docs/environment-variables).

## 3. Conferir antes de começar

1. Abra o painel em uma janela e a página pública em outra, de preferência em uma janela anônima.
2. Salve um resultado de teste e confira se a tabela pública muda sem recarregar. O primeiro salvamento do painel cria o estado do evento no banco.
3. Corrija o placar e confira o novo cálculo. Depois, remova a partida de teste pelo botão **×** ao lado dela e confirme, para começar o evento com a tabela zerada.
4. Abra `/admin` na janela anônima: ela deve pedir login, e o público deve continuar conseguindo ler o evento.
5. Confira no **Table Editor → tournament_state** se existe apenas a linha `main`. Não altere o JSON manualmente durante o evento.

O SQL restringe gravações aos usuários cadastrados em `event_admins`; visitantes só leem. O navegador não recebe permissão para excluir a linha do evento no banco ou cadastrar administradores; o painel permite corrigir e remover partidas. A versão de cada gravação impede que uma janela administrativa sobrescreva silenciosamente uma versão mais recente. [Referências: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime](https://supabase.com/docs/guides/realtime/postgres-changes).

Use os planos gratuitos conforme os limites exibidos nas suas contas. O teste entre as duas janelas confirma a conexão do seu projeto; disponibilidade e velocidade também dependem dos serviços e da internet.

## Desenvolvimento local

Use Node.js 22 LTS ou mais recente e npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Preencha `.env.local` com as duas variáveis do Supabase. Reinicie `npm run dev` depois de alterá-las. O arquivo local de ambiente não deve ser versionado.

```powershell
npm run test
npm run build
npm run preview
```

Sem as variáveis, o site permite uma prévia local. A publicação do evento precisa da conexão com o Supabase.
