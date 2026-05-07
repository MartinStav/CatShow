# CatShow

Webová aplikácia na riadenie výstav mačiek (nominácia, ringy, BIS, live monitoring).

## Spustenie cez Docker

Vyžaduje Docker Desktop (alebo iný Docker engine) s Docker Compose.

```bash
cp .env.docker.example .env
node -e "console.log('APP_KEY=' + require('crypto').randomBytes(32).toString('base64'))" >> .env

docker compose up -d --build
```

Aplikácia bude dostupná na <http://localhost:8080>.

Predvolený superadmin (po prvom prihlásení si nastavíš vlastné heslo):

- email: `admin@catshow.sk`
- heslo: `admin`
