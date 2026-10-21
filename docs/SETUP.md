# Setting up Postiz (jx fork)

This guide gets this fork running on your own machine or server with Docker, and then walks you through connecting each social platform. The fork has its own changes (Snapchat, Stories, Profiles, new look), so it is built from source on your machine. The upstream `ghcr.io/gitroomhq/postiz-app` image does not contain them.

- [1. Quick start](#1-quick-start)
- [2. Configuration basics](#2-configuration-basics)
- [3. Connecting your platforms](#3-connecting-your-platforms)
- [4. Posts vs Stories](#4-posts-vs-stories)
- [5. Profiles](#5-profiles)
- [6. Updating](#6-updating)
- [7. Backups](#7-backups)
- [8. Troubleshooting](#8-troubleshooting)

## 1. Quick start

You need Docker with Compose v2 (`docker compose version` should work; v2.24 or newer), about 4 GB of free RAM for the first build, and a few GB of disk space.

```bash
git clone <this repository> postiz-app-jx
cd postiz-app-jx
./install.sh
```

`install.sh` does everything for you:

1. checks that Docker and Docker Compose v2 are available,
2. creates `.env` from `.env.example` and generates a random `JWT_SECRET` plus database and Redis passwords,
3. asks for the public URL (default `http://localhost:4007`) and fills `MAIN_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_BACKEND_URL` (`<url>/api`) and `BACKEND_INTERNAL_URL`,
4. runs `docker compose up -d --build` and prints the address.

The first build compiles the whole app and takes 10 to 20 minutes. After that, give the stack one to three minutes to start (database setup and Temporal), then open the URL and create your account.

Options: `./install.sh --non-interactive` never asks anything, `./install.sh --url https://postiz.example.com` sets the URL up front, `./install.sh --no-start` only prepares `.env`. It is safe to run again; existing secrets are kept.

Once your own account exists, set `DISABLE_REGISTRATION="true"` in `.env` and run `docker compose up -d` so nobody else can sign up.

## 2. Configuration basics

All settings live in one file, `.env` (never commit it). `.env.example` documents every setting in sections: Core, Storage, Social channels, Other channels, Misc. After editing `.env`, apply it with:

```bash
docker compose up -d
```

What runs: `postiz` (the app, port `4007` on your machine), `postiz-postgres`, `postiz-redis` and the Temporal stack (`temporal`, its database, Elasticsearch, `temporal-ui` on port `8080`). The `spotlight` debugging container only starts when you ask for it: `docker compose --profile debug up -d`.

### The public URL matters

`FRONTEND_URL` has to be exactly the address you open Postiz on, because every platform sends you back to `<FRONTEND_URL>/integrations/social/<platform>` after you log in there. If you change the URL later, change it in `.env` and in every developer app below.

- Running on your own computer: `http://localhost:4007` works for most platforms.
- Running on a server: use a domain with https (put a reverse proxy such as Caddy, Traefik or nginx in front of port `4007`, and set the URL to `https://postiz.example.com`). Several platforms (Meta, TikTok, Snapchat, X) are much easier or only possible with https.
- Plain `http` on a LAN address such as `http://192.168.1.20:4007` works only with `NOT_SECURED=true` (the installer sets it for you).

### Storage

By default uploads are stored in the `postiz-uploads` Docker volume. Platforms download your media from your public URL, so for Instagram and others to fetch it your server must be reachable from the internet, or use Cloudflare R2 (`STORAGE_PROVIDER="cloudflare"` and the `CLOUDFLARE_*` settings).

## 3. Connecting your platforms

For each platform: create a developer app, set the **redirect URL** exactly as shown, copy the keys into `.env`, run `docker compose up -d`, then in Postiz use **Add channel** and pick the platform. In the table, `<URL>` is your `FRONTEND_URL` (for example `https://postiz.example.com`).

| Platform | .env keys | Redirect URL |
| --- | --- | --- |
| Facebook Page | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | `<URL>/integrations/social/facebook` |
| Instagram (Facebook Business) | same Meta app as Facebook | `<URL>/integrations/social/instagram` |
| Instagram (Standalone) | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | `<URL>/integrations/social/instagram-standalone` |
| X | `X_API_KEY`, `X_API_SECRET` (`X_URL` optional) | `<X_URL or URL>/integrations/social/x` |
| Threads | `THREADS_APP_ID`, `THREADS_APP_SECRET` | `<URL>/integrations/social/threads` |
| TikTok | `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` | `<URL>/integrations/social/tiktok` |
| Reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | `<URL>/integrations/social/reddit` |
| Snapchat | `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET` | `<URL>/integrations/social/snapchat` |
| Bluesky | none | none (App Password in the UI) |
| WordPress | none | none (Application Password in the UI) |

> **If your URL starts with `http://`**: Threads, Instagram (Standalone) and TikTok send the redirect through `redirectmeto.com` because those platforms refuse plain http redirects. The redirect URL to register in their developer app is then `https://redirectmeto.com/<URL>/integrations/social/<platform>`, for example `https://redirectmeto.com/http://localhost:4007/integrations/social/threads`. With an `https://` URL none of this applies; use the plain URL from the table.

### Facebook and Instagram (Meta)

One Meta app covers the **Facebook Page** channel and the **Instagram (Facebook Business)** channel.

1. Go to [developers.facebook.com](https://developers.facebook.com/apps), **Create app**, use case **Other**, type **Business**.
2. Add the **Facebook Login for Business** (or Facebook Login) product. Under its settings add both redirect URLs (valid OAuth redirect URIs): `<URL>/integrations/social/facebook` and `<URL>/integrations/social/instagram`.
3. **App settings > Basic**: copy **App ID** and **App Secret** into `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`. Add your domain under App domains and a privacy policy URL.
4. Permissions Postiz asks for:
   - Facebook: `pages_show_list`, `business_management`, `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement`, `read_insights`
   - Instagram: `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`
5. While the app is in **Development** mode these work for people with a role on the app (add yourself as admin). To use them with other accounts, switch the app to **Live** and complete App Review for the permissions above.

Account requirements:
- Facebook: you must manage a **Facebook Page** (posting to personal profiles is not possible).
- Instagram (Facebook Business): the Instagram account must be a **Business or Creator** account **linked to a Facebook Page** that you manage. Stories and posts both need this.

### Instagram (Standalone)

Use this if you do not want to link a Facebook Page.

1. In the same Meta app (or a new one) add the product **Instagram** > **API setup with Instagram login**.
2. Under **Set up Instagram business login** add the redirect URL `<URL>/integrations/social/instagram-standalone` (see the `redirectmeto.com` note above for http).
3. Copy the **Instagram app ID** and **Instagram app secret** (these are different from the Facebook ones) into `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`.
4. Permissions requested: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights`.
5. The Instagram account must be a Business or Creator (professional) account, and added as an Instagram tester on the app while in Development mode.

### X (Twitter)

1. Open the [X developer portal](https://developer.x.com/en/portal/dashboard) and create a project and app.
2. **User authentication settings**: enable it, App permissions **Read and write**, type **Web App, Automated App or Bot**.
3. Callback URI: `<URL>/integrations/social/x`. If you set `X_URL` in `.env`, the callback uses `X_URL` instead of the public URL. Website URL: your public URL.
4. **Keys and tokens**: copy **API Key** and **API Key Secret** (the consumer keys) into `X_API_KEY` and `X_API_SECRET`. Postiz asks for no extra scopes; it uses the OAuth 1.0a flow with write access.
5. Posting through the API requires an X API plan that allows writes; check your access level in the portal.

### Threads

1. In your Meta app add the **Threads** use case / product.
2. Add the redirect URL `<URL>/integrations/social/threads` (and the same URL for the Uninstall and Delete callbacks if the form requires them). See the `redirectmeto.com` note for http URLs.
3. Copy the **Threads app ID** and **Threads app secret** (shown in the Threads settings, not the main app settings) into `THREADS_APP_ID` and `THREADS_APP_SECRET`.
4. Permissions requested: `threads_basic`, `threads_content_publish`, `threads_manage_replies`, `threads_manage_insights`.
5. Add your Threads account as a **Threads tester** while the app is in Development mode, then accept the invite in the Threads app.

### TikTok

1. Create an app at [developers.tiktok.com](https://developers.tiktok.com/apps).
2. Add the **Login Kit** and **Content Posting API** products. Under Login Kit add the redirect URI `<URL>/integrations/social/tiktok` (see the `redirectmeto.com` note for http). TikTok requires verified URL properties for your domain, so you need a real https domain for production use.
3. Copy **Client key** and **Client secret** into `TIKTOK_CLIENT_ID` and `TIKTOK_CLIENT_SECRET`.
4. Scopes requested: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.publish`, `video.upload`.
5. **Direct posting needs an app audit.** Until TikTok approves your app, videos can only be sent as uploads to the TikTok inbox/drafts (you finish and publish them inside the TikTok app), and posts made through unaudited apps are private. Submit the app for audit with a demo video once everything works.
6. Add your TikTok account as a **Target user** (sandbox) while testing.

### Reddit

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) and click **create another app**.
2. Choose type **web app**. Set **redirect uri** to `<URL>/integrations/social/reddit`.
3. The string under the app name is the client id, the **secret** is the client secret. Put them in `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.
4. Scopes requested: `read`, `identity`, `submit`, `flair`.
5. Many subreddits restrict new or low-karma accounts, and each subreddit has its own rules for flairs and post types. Postiz lets you choose the subreddit and flair when you create the post.

### Snapchat

Postiz publishes through the Snapchat **Public Profile API**, which is **allowlist-only**: Snap must give your business access before this works. Request access from Snap first.

1. Open [Snapchat Business Dashboard](https://business.snapchat.com) > **Business Details** and create an **OAuth app** there (not in the old Snap Kit developer portal).
2. Set the redirect URL to `<URL>/integrations/social/snapchat`.
3. Request the scope `snapchat-profile-api`.
4. Copy the **Client ID** and **Client Secret** into `SNAPCHAT_CLIENT_ID` and `SNAPCHAT_CLIENT_SECRET`.
5. You need a **Public Profile** on Snapchat to post to. When connecting, log in with the Snapchat account that manages it.
6. Snapchat accepts exactly one video (MP4) per post: Spotlights 6 to 60 seconds, Stories 5 to 60 seconds and at least 540x960 (vertical). See [Posts vs Stories](#4-posts-vs-stories).

### Bluesky

No developer app and no `.env` settings.

1. In Bluesky go to **Settings > Privacy and security > App passwords** and create one (never use your main password).
2. In Postiz: **Add channel > Bluesky**. Service: `https://bsky.social` (or your own PDS address), Identifier: your handle such as `you.bsky.social`, Password: the app password.

### WordPress (self-hosted)

No developer app and no `.env` settings. Postiz talks to the WordPress REST API with an **Application Password** over HTTP Basic auth.

1. In your WordPress admin open **Users > Profile**, scroll to **Application Passwords**, enter a name such as "Postiz" and click **Add New Application Password**. Copy it (it is only shown once).
2. In Postiz: **Add channel > WordPress**. Domain URL: your site, for example `https://blog.example.com`. Username: the WordPress login name of that user. Password: the application password.
3. The user needs permission to create posts (Author, Editor or Administrator). Your site must be reachable from the Postiz server, use https, and not block `/wp-json/` or the `Authorization` header (some security plugins such as Wordfence and some hosts do). If Postiz runs next to WordPress on a private network, see `DISABLE_SSRF_PROTECTION` in `.env.example`.

## 4. Posts vs Stories

Postiz keeps normal posts and Stories apart so one never turns into the other by accident.

- A **Post** goes to the feed of the channel. That is the default everywhere.
- A **Story** is a short-lived vertical photo or video. Facebook, Instagram (both kinds) and Snapchat support Stories. Pick **Create Story** when creating the content; other channels in the same draft keep posting normally.
- Stories need at least one media file (Snapchat ignores the post text for Stories). Use vertical media (9:16, 1080x1920 is ideal).
- On **Snapchat** a normal post is published as a **Spotlight** (6 to 60 seconds, description up to 160 characters, reviewed by Snapchat). **Create Story** publishes a Story instead, and you can choose how long it stays visible (1, 2 or 3 days, or 1 week).
- Stories on Instagram and Facebook require the account requirements from the [Meta section](#facebook-and-instagram-meta): a Business/Creator Instagram account linked to a Facebook Page, or a Facebook Page you manage.

## 5. Profiles

Profiles let you run separate brands from one install, for example **Music** and **Software**. Each profile has its own channels, calendar and media library, so nothing leaks between them.

1. Use the **profile switcher in the top bar** to see your profiles.
2. Choose **New profile**, give it a name, and switch to it.
3. Connect channels while that profile is active. They only show up in that profile's calendar and when creating posts.
4. Switch profiles any time from the same menu. Channels you connected before profiles existed are not removed.

## 6. Updating

```bash
./update.sh
```

This runs `git pull --ff-only` and `docker compose up -d --build`. Your `.env` and your data volumes are kept; database changes are applied automatically on start. Take a [backup](#7-backups) before bigger updates. To update by hand: `git pull && docker compose up -d --build`.

## 7. Backups

Your data lives in Docker volumes: `postgres-volume` (database), `postiz-uploads` (media), `postiz-config` and `postiz-redis-data`. Compose prefixes the volume names with the project name (by default the folder name, for example `postiz-app-jx_postgres-volume`); `docker volume ls` shows them.

Back up the database:

```bash
docker compose exec -T postiz-postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > postiz-backup-$(date +%F).sql
```

Restore it into a fresh database:

```bash
docker compose exec -T postiz-postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < postiz-backup-2025-01-01.sql
```

Back up uploaded media (local storage only):

```bash
docker run --rm -v postiz-app-jx_postiz-uploads:/data -v "$PWD":/backup alpine tar czf /backup/postiz-uploads-$(date +%F).tgz -C /data .
```

Also keep a copy of `.env` somewhere safe (it holds your `JWT_SECRET` and platform keys).

## 8. Troubleshooting

**See what is happening**

```bash
docker compose ps                 # is everything "running" / "healthy"?
docker compose logs -f postiz     # app logs (frontend, backend, workers)
docker compose logs temporal      # Temporal server
```

**The page does not load right after install.** The first start takes 1 to 3 minutes (database migration, then the apps start behind nginx). Watch `docker compose logs -f postiz` until the frontend reports it is ready.

**Port already in use.** Change `POSTIZ_PORT` in `.env` (and the port in `FRONTEND_URL`, `MAIN_URL` and `NEXT_PUBLIC_BACKEND_URL`), then `docker compose up -d`. Port `8080` (Temporal UI) and `7233` (Temporal) can be changed in `docker-compose.yaml`.

**Temporal is slow or fails to start.** Temporal needs its Postgres and Elasticsearch to be up first; on a slow machine `temporal` may restart a few times and then settles. Run `docker compose logs temporal temporal-elasticsearch`. Elasticsearch needs roughly 512 MB of RAM; on low-memory servers add swap. If posts stay "queued" and never publish, Temporal is the first place to look: open `http://localhost:8080` to see the workflows.

**I can register but login does not stick.** You are on plain `http` with a non-local address. Set `NOT_SECURED=true` in `.env` (or use https), then `docker compose up -d`.

**"Redirect URI mismatch" / "invalid redirect_uri" when connecting a platform.** The redirect URL in the developer app must be exactly `<FRONTEND_URL>/integrations/social/<platform>`, including http vs https and no trailing slash. On `http` URLs remember the `redirectmeto.com` form for Threads, Instagram (Standalone) and TikTok.

**A platform button is missing or does nothing.** The keys in `.env` are empty or wrong. Check them, run `docker compose up -d` (a plain restart does not re-read `.env`), and check `docker compose logs postiz`.

**Database password changed and now nothing connects.** Postgres stores its password in its volume the first time it is created, so editing `POSTGRES_PASSWORD` afterwards has no effect there. Change it inside the database instead (`docker compose exec postiz-postgres psql -U postiz-user -d postiz-db-local -c "ALTER USER \"postiz-user\" PASSWORD 'new-password';"`) and then update `.env`, or restore the old value. Changing `REDIS_PASSWORD` is always safe.

**Build runs out of memory.** The build needs about 4 GB of RAM. Close other programs, add swap, or build on a bigger machine.

**Start completely fresh (deletes all data).** `docker compose down -v` removes the containers and all volumes. Only do this if you really want to lose everything.
