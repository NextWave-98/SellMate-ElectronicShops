# SellMate Electronic Shops   Vite build → nginx static
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src

# Build-time public env (override via --build-arg / compose)
ARG VITE_BASE_URL=https://api2.sellmate.lk/api
ARG VITE_CLOUDINARY_URL=https://res.cloudinary.com
ARG VITE_SUPER_ADMIN_SECRET=
ARG VITE_SHOP_SITE_URL=http://169.58.206.94:4173
ARG VITE_PUBLIC_SITE_URL=https://rental.sellmate.lk
ARG VITE_SOCKET_URL=
ARG VITE_META_APP_ID=
ARG VITE_FB_LEADS_SCOPE=

ENV VITE_BASE_URL=$VITE_BASE_URL \
    VITE_CLOUDINARY_URL=$VITE_CLOUDINARY_URL \
    VITE_SUPER_ADMIN_SECRET=$VITE_SUPER_ADMIN_SECRET \
    VITE_SHOP_SITE_URL=$VITE_SHOP_SITE_URL \
    VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_META_APP_ID=$VITE_META_APP_ID \
    VITE_FB_LEADS_SCOPE=$VITE_FB_LEADS_SCOPE

RUN npm run build

# ── Runtime ──────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
