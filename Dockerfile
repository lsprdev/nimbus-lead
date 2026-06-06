FROM golang:1.25-bookworm AS builder

WORKDIR /src

ENV PLAYWRIGHT_DRIVER_PATH=/playwright-driver

COPY go.mod go.sum ./
RUN go mod download

RUN go run github.com/playwright-community/playwright-go/cmd/playwright@v0.5700.1 install chromium

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/kartapro .

FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

ENV HEADLESS=true \
    PLAYWRIGHT_DRIVER_PATH=/ms-playwright-go \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY --from=builder /out/kartapro /app/kartapro
COPY --from=builder /playwright-driver /ms-playwright-go

VOLUME ["/app/pb_data"]

CMD ["/app/kartapro", "serve", "--http=0.0.0.0:8090"]
