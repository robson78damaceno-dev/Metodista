# Sistema de Votação Anônima para Concílio

Aplicação web em Next.js para votação secreta em concílio metodista, com painel administrativo, link único por eleitor (CPF + e-mail), urna anônima e resultados agregados.

## Princípio de anonimato

O sistema separa tecnicamente duas responsabilidades:

- **Identificação do eleitor:** CPF e e-mail validam elegibilidade; o link de voto (`/entrar/[ticket]`) é de uso único. Apenas hashes e status ficam no Redis com TTL.
- **Voto:** armazena somente contagem agregada por candidato (Sim / Não / Abster) e feedback opcional sem identificação.

Quando o eleitor abre o link válido, o sistema emite uma cédula anônima temporária em cookie `httpOnly`. O voto é enviado usando apenas essa cédula. A proteção contra replay também é temporária e expira automaticamente.

## Stack

- Next.js App Router, React e TypeScript
- TailwindCSS, shadcn/ui e Framer Motion
- Upstash Redis (TTL) e Resend
- Server Actions e Route Handlers
- Zod, JWT `httpOnly`, CSRF, rate limiting e headers de segurança

## Configuração local

1. Instale dependências:

```bash
npm install
```

2. Crie `.env` a partir de `.env.example` e configure:

```bash
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
RESEND_API_KEY="re_..."
EMAIL_FROM="Concilio <onboarding@resend.dev>"
APP_URL="http://localhost:3000"
AUTH_SECRET="..."
CODE_HASH_SECRET="..."
CSRF_SECRET="..."
SEED_ADMIN_LOGIN="admin"
SEED_ADMIN_PASSWORD="admin@@"
```

Use segredos longos e diferentes:

```bash
openssl rand -base64 32
```

3. Rode o projeto:

```bash
npm run dev
```

## Armazenamento temporário

Use Upstash Redis para dados da votação com TTL automático. Em desenvolvimento, se o Upstash não estiver configurado, o app pode usar memória local (não use isso em produção). Ao encerrar a eleição, o sistema envia o resultado para os 2 e-mails configurados no painel.

## Deploy na Vercel

Guia completo passo a passo: **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)**

Resumo:

1. Crie banco **Upstash Redis** e conta **Resend** (domínio verificado para produção).
2. Gere três segredos (`AUTH_SECRET`, `CODE_HASH_SECRET`, `CSRF_SECRET`).
3. Envie o código para o **GitHub** (sem commitar `.env`).
4. Importe o repositório na **Vercel** e configure **todas** as variáveis de ambiente antes do deploy.
5. Após o deploy, atualize `APP_URL` com a URL final e faça **Redeploy**.
6. Teste o fluxo CPF → e-mail → voto e troque a senha admin no painel.

Validação local antes do deploy:

```bash
npm run typecheck
npm run build
```

## Operação segura

- O eleitor solicita o link na home com CPF e e-mail; não há lista de códigos distribuídos manualmente no fluxo atual.
- Não acompanhe resultados durante uma votação muito pequena em andamento. O painel não usa atualização em tempo real para reduzir risco de dedução.
- Exporte apenas resultados agregados e feedbacks anônimos (PDF no painel).
- Não adicione logs de payloads de votação em produção.
- Em produção, não defina `USE_DEV_MEMORY_STORE`.

## Rotas principais

- `/`: entrada pública — CPF + e-mail para receber o link de votação.
- `/entrar/[ticket]`: valida o ticket e abre a cédula (cookie anônimo).
- `/votar`: cédula com Sim / Não / Abster por candidato.
- `/sucesso`: confirmação de voto registrado.
- `/admin/sair`: encerra sessão administrativa.
- `/admin/login`: login administrativo.
- `/admin`: painel de eleições, candidatos, exportação PDF e conta do administrador.

## Conta do administrador

No painel (`/admin`), abra **Conta do administrador** para alterar usuário e senha de login.

Na primeira execução, o sistema usa `SEED_ADMIN_LOGIN` e `SEED_ADMIN_PASSWORD` do `.env` apenas para criar a conta inicial no Redis. Depois disso, as alterações feitas no painel passam a valer.

## Garantias de desenho

- Votos nunca guardam CPF, e-mail, IP, user-agent, sessão ou token de entrada.
- Dados de elegibilidade nunca guardam escolha de candidato ou feedback.
- Administradores veem apenas totais agregados.
- Feedbacks exportados não incluem timestamps nem qualquer dado de identificação.
