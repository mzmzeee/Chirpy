# Chirpy

a twitter-like REST API built with Go from the [boot.dev](https://boot.dev) backend development course.

this project was my deep dive into the Go ecosystem and building production style HTTP servers from scratch. through building Chirpy, I learned how to wire together a real backend: routing, database access, authentication, middleware, and everything in between.

## what i learned

- **Go's `net/http`** — the standard library is way more capable than i expected. built-in routing with method based patterns (`GET /api/chirps`), path parameters (`{chirpID}`), middleware chaining, and `http.Handler`/`http.HandlerFunc` interfaces
- **sqlc** — generates type-safe Go code directly from SQL queries. no ORM, no magic just write SQL and get functions. completely changed how i think about database layers
- **Goose** — database migration tool that keeps schema changes versioned and reversible. ran migrations up and down cleanly throughout development
- **PostgreSQL** — the database behind everything. users, chirps, refresh tokens — all relational with proper foreign keys and cascading deletes
- **JWT authentication** — access tokens with expiration, refresh tokens for long lived sessions, and revocation. learned the full token lifecycle
- **Argon2id password hashing** — industry-standard password hashing via `argon2id`. never store plaintext
- **API key auth** — separate auth scheme for webhook endpoints (the Polka integration)
- **middleware patterns** — wrapping handlers to track metrics, inject config, and protect routes
- **Go structs and JSON** — struct tags for serialization, encoding/decoding request bodies, and building clean response shapes

## project structure

```
Chirpy/
├── main.go              # entrypoint — server setup, route registration, config
├── handlers.go          # all HTTP handler logic (CRUD for users & chirps, auth, webhooks)
├── helpers.go           # JSON response helpers, chirp text cleaning
├── middleware.go         # request metrics middleware
├── internal/
│   ├── auth/            # JWT creation/validation, password hashing, token parsing
│   │   ├── auth.go
│   │   └── auth_test.go
│   └── database/        # sqlc-generated type-safe database layer
│       ├── db.go
│       ├── models.go
│       ├── users.sql.go
│       ├── chirps.sql.go
│       └── refresh_tokens.sql.go
├── sql/
│   ├── schema/          # goose migration files (versioned DDL)
│   └── queries/         # sqlc source queries
├── sqlc.yaml            # sqlc configuration
└── assets/              # static assets (logo)
```

## API endpoints

| Method   | Path                    | Auth          | Description                                           |
| -------- | ----------------------- | ------------- | ----------------------------------------------------- |
| `GET`    | `/api/healthz`          | none          | health check — returns `OK`                           |
| `POST`   | `/api/users`            | none          | register a new user                                   |
| `PUT`    | `/api/users`            | JWT           | update email/password                                 |
| `POST`   | `/api/login`            | none          | login, returns access + refresh tokens                |
| `POST`   | `/api/refresh`          | refresh token | get a new access token                                |
| `POST`   | `/api/revoke`           | refresh token | revoke a refresh token                                |
| `POST`   | `/api/chirps`           | JWT           | create a chirp (max 140 chars)                        |
| `GET`    | `/api/chirps`           | none          | list chirps (optional `?author_id=` and `?sort=desc`) |
| `GET`    | `/api/chirps/{chirpID}` | none          | get a single chirp                                    |
| `DELETE` | `/api/chirps/{chirpID}` | JWT           | delete your own chirp                                 |
| `POST`   | `/api/polka/webhooks`   | API key       | handle Polka webhook events (user upgrade)            |
| `GET`    | `/admin/metrics`        | none          | view request hit count (HTML)                         |
| `POST`   | `/admin/reset`          | dev only      | reset metrics + delete all users                      |
| `GET`    | `/app/*`                | none          | static file server                                    |

## database schema

5 migrations built incrementally as features were added:

1. **users** — `id`, `created_at`, `updated_at`, `email`
2. **chirps** — `id`, `created_at`, `updated_at`, `body`, `user_id` (FK → users, cascade delete)
3. **hashed_password** — added `hashed_password` column to users
4. **refresh_tokens** — `token`, `user_id` (FK), `expires_at`, `revoked_at`
5. **chirpy_red** — added `is_chirpy_red` boolean to users (premium tier)

## auth flow

- **registration** → password is hashed with argon2id, user is stored
- **login** → credentials verified, JWT access token (1hr) + refresh token (60 days) returned
- **refresh** → send refresh token in `Authorization: Bearer ...` header, get a new access token
- **revoke** → invalidate a refresh token so it can't be used again
- **protected routes** → validate JWT from `Authorization: Bearer ...` header, extract user ID

the Polka webhook uses a separate API key auth scheme (`Authorization: ApiKey ...`) for third-party integration.

## how to run

```bash
# set up environment
cp .env.example .env   # configure DB_URL, PLATFORM, jwt_secret, POLKA_KEY

# run migrations (requires goose)
goose -dir sql/schema postgres $DB_URL up

# generate sqlc code (after changing queries)
sqlc generate

# build and run
go build -o chirpy-server .
./chirpy-server
```

the server listens on `:8080`.

## tech stack

- **Go 1.26** — main language
- **PostgreSQL** — database
- **sqlc** — SQL → Go code generation
- **Goose** — database migrations
- **argon2id** — password hashing
- **golang-jwt/jwt** — JWT creation and validation
- **godotenv** — environment variable loading
- **google/uuid** — UUID generation

## what's next

things i'd add if i kept building on this:

- rate limiting middleware
- request logging (structured, not just hit counting)
- proper error types instead of string messages
- database transactions for multi-step operations
- integration tests hitting the actual HTTP endpoints
- OpenAPI/Swagger docs
