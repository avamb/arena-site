# Static site image, built from the SAME dist/ as the Workers deploy (doc 33 §3.7a).
# Build context: repository root, after `npm run build`.
#   docker build -f ops/nginx/Dockerfile -t arena-site:local .
#   docker run --rm -p 8080:8080 -e FORMS_UPSTREAM=forms:8787 arena-site:local
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
RUN rm -f /etc/nginx/conf.d/default.conf \
 && mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
 && chown -R nginx:nginx /tmp /etc/nginx/conf.d
COPY --chown=nginx:nginx ops/nginx/nginx.conf /etc/nginx/templates/nginx.conf.template
COPY --chown=nginx:nginx ops/nginx/headers.conf ops/nginx/redirects.conf /etc/nginx/conf.d/
COPY --chown=nginx:nginx dist/ /usr/share/nginx/html/
USER nginx

ENV FORMS_UPSTREAM=127.0.0.1:8787
# The official image renders /etc/nginx/templates/*.template with envsubst into /etc/nginx/conf.d;
# we want the result as the main config, so render it ourselves at start.
CMD ["/bin/sh", "-c", "envsubst '$FORMS_UPSTREAM' < /etc/nginx/templates/nginx.conf.template > /tmp/nginx.conf && exec nginx -c /tmp/nginx.conf -g 'daemon off;'"]

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
