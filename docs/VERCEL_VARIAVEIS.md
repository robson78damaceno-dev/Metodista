# Como colocar o .env na Vercel (sem enviar para o GitHub)

O arquivo `.env` **não vai para o GitHub** (e não deve). Na Vercel você **copia os mesmos valores** para o painel.

## Passo a passo (5 minutos)

1. Abra seu `.env` local no Cursor (na pasta `Concilio`).
2. Abra a Vercel: [vercel.com](https://vercel.com) → seu projeto **Metodista** ou **Concilio**.
3. Menu **Settings** → **Environment Variables**.
4. Para **cada linha** do `.env` (exceto comentários), clique **Add New**:

| Key | Value | Environments |
|-----|-------|----------------|
| Nome da variável (ex.: `AUTH_SECRET`) | Cole o valor **sem aspas** | Marque **Production** ✓ |

5. Repita para **todas** estas chaves:

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
EMAIL_FROM
APP_URL
AUTH_SECRET
CODE_HASH_SECRET
CSRF_SECRET
SEED_ADMIN_LOGIN
SEED_ADMIN_PASSWORD
```

6. **Importante:** em cada variável, marque **Production** e **Preview**.  
   - Só Production → links `*-git-main-*.vercel.app` dão erro **500**.  
   - Só Development → o build de produção falha com "variáveis ausentes".

7. Depois de salvar todas: **Deployments** → último deploy → **⋮** → **Redeploy**.

## APP_URL na primeira vez

Se ainda não souber a URL final:

1. Use temporariamente: `https://seu-projeto.vercel.app` (a URL que a Vercel mostra no projeto).
2. Depois do 1º deploy bem-sucedido, corrija `APP_URL` e faça **Redeploy** de novo.

## Conferir se salvou

Em **Settings → Environment Variables** devem aparecer **10 variáveis** com Production marcado.

## Erro que você viu

```
Variáveis de ambiente inválidas ou ausentes (UPSTASH_REDIS_REST_URL, ...)
```

Significa: a Vercel **não recebeu** esses valores. Não é falta de `.env` no Git — é falta de cadastro no painel (ou **Production** não marcado).

O deploy pode **compilar** mesmo assim, mas o site **não funciona** até você cadastrar todas as variáveis e fazer **Redeploy**.

## Erro de build: `npm run build exited with 1`

Causas comuns depois de cadastrar variáveis:

| Valor errado na Vercel | Correto |
|------------------------|---------|
| `SUBSTITUIR_NO_UPSTASH` | URL real do Upstash (`https://....upstash.io`) |
| `COPIAR_LINHA_8_DO_ENV` | Cole o valor real do `.env` (começa com `re_`) |
| Domínio **deste** projeto na Vercel (ex.: `metodista-ten.vercel.app`) | `https://metodista-ten.vercel.app` |

**Atenção:** `metodista.vercel.app` pode estar ligado a **outro** projeto na Vercel (não é o Concílio). Se `APP_URL` apontar para um domínio errado, o link do e-mail dá **404**. Use a URL que abre a página “Concílio | Votação Anônima”.
| Aspas no valor (`"admin@@"`) | Sem aspas: `admin@@` |

Abra o log do deploy na Vercel e procure a linha com `Variáveis de ambiente inválidas` — ela mostra qual campo falhou.

## Por que NÃO commitar o .env no GitHub?

- Qualquer pessoa pode ver suas chaves do Redis, Resend e segredos.
- Mesmo removendo depois, o histórico do Git guarda para sempre.
- A Vercel foi feita para guardar segredos no painel, não no código.

## Atalho: colar várias de uma vez

Na tela **Environment Variables**, use **Bulk Edit** (se aparecer) e cole no formato:

```
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token
RESEND_API_KEY=re_xxxxx
...
```

(Copie os valores do seu `.env` local, uma linha por variável.)

Depois confira se **Production** está selecionado e faça **Redeploy**.

## Erro do Prisma no build

Se aparecer `PrismaClient` / `prisma/seed.ts`:

1. Na Vercel: **Settings → Git** — confirme que o repositório é o correto (ex.: `Metodista`) e o commit recente (sem pasta `prisma/`).
2. **Deployments** → ⋮ → **Redeploy** e marque **Clear build cache** (se existir a opção).
3. No GitHub, abra o repositório e veja se a pasta `prisma/` ainda existe — não deve existir após o commit `Remover Prisma não utilizado`.
