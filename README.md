# Backend API

![screenshot of Swagger UI](/docs/screenshot.png)

## Use `mise` to manage node and pnpm

<https://mise.jdx.dev/getting-started.html>

## Run

Run docker compose to start:

- Postgres
- Redis
- Mailpit (An email and SMTP testing tool with an UI on <http://localhost:8025>)

```sh
pnpm docker:up
```

Migrate database.

```sh
pnpm db:migrate
```

Start the API server.

```sh
pnpm dev
```
