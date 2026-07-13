FROM golang:1.26.5-alpine3.23 AS builder

WORKDIR /src

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux \
    go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/chirpy \
    .

RUN CGO_ENABLED=0 GOBIN=/out \
    go install github.com/pressly/goose/v3/cmd/goose@v3.27.2


FROM alpine:3.23

RUN apk add --no-cache ca-certificates curl \
    && addgroup -S chirpy \
    && adduser -S -G chirpy chirpy

WORKDIR /app

COPY --from=builder /out/chirpy /usr/local/bin/chirpy
COPY --from=builder /out/goose /usr/local/bin/goose

COPY --from=builder /src/sql/schema ./sql/schema
COPY --from=builder /src/web ./web
COPY --from=builder /src/assets ./assets

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh

USER chirpy

EXPOSE 8080

HEALTHCHECK \
    --interval=10s \
    --timeout=5s \
    --start-period=30s \
    --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/api/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
