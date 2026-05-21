# ── Build stage: sem necessidade — site 100% estático ────────────────────────
# Usamos diretamente o nginx:alpine como imagem final.
# O build stage seria necessário apenas se houvesse bundler (Vite, Webpack, etc.)
FROM nginx:1.27-alpine

# Metadados da imagem
LABEL maintainer="signidigital"
LABEL description="Página de pagamento PIX - Academias"

# Remove a config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa config customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos
COPY index.html  /usr/share/nginx/html/
COPY styles.css  /usr/share/nginx/html/
COPY app.js      /usr/share/nginx/html/

# Nginx escuta na porta 80
EXPOSE 80

# Health check para o Coolify monitorar o container
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
