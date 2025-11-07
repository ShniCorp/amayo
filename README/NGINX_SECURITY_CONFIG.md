# Configuración de Nginx para Backend Seguro

# /etc/nginx/sites-available/api.amayo.dev

# Configuración para ocultar la IP del servidor y mejorar la seguridad

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=3r/m;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Bloquear IPs que no sean de Cloudflare
geo $realip_remote_addr $cloudflare_ip {
    default 0;
    
    # Cloudflare IPv4 (actualizar periódicamente desde https://www.cloudflare.com/ips-v4)
    173.245.48.0/20 1;
    103.21.244.0/22 1;
    103.22.200.0/22 1;
    103.31.4.0/22 1;
    141.101.64.0/18 1;
    108.162.192.0/18 1;
    190.93.240.0/20 1;
    188.114.96.0/20 1;
    197.234.240.0/22 1;
    198.41.128.0/17 1;
    162.158.0.0/15 1;
    104.16.0.0/13 1;
    104.24.0.0/14 1;
    172.64.0.0/13 1;
    131.0.72.0/22 1;
    
    # Cloudflare IPv6
    2400:cb00::/32 1;
    2606:4700::/32 1;
    2803:f800::/32 1;
    2405:b500::/32 1;
    2405:8100::/32 1;
    2a06:98c0::/29 1;
    2c0f:f248::/32 1;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.amayo.dev;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.amayo.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "same-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
    
    # Ocultar versión de Nginx
    server_tokens off;
    more_clear_headers Server;
    more_clear_headers X-Powered-By;

    # Logs
    access_log /var/log/nginx/api.amayo.dev.access.log combined buffer=32k;
    error_log /var/log/nginx/api.amayo.dev.error.log warn;

    # Bloquear acceso directo (solo Cloudflare)
    if ($cloudflare_ip = 0) {
        return 403 "Direct access forbidden";
    }

    # Validar que viene de Cloudflare verificando headers
    if ($http_cf_connecting_ip = "") {
        return 403 "Missing Cloudflare headers";
    }

    # Usar la IP real del cliente (desde Cloudflare)
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    # Bloquear user agents sospechosos
    if ($http_user_agent ~* (curl|wget|python|scrapy|nikto|nmap|sqlmap)) {
        return 403 "Forbidden user agent";
    }

    # Rate limiting
    location /api/auth {
        limit_req zone=auth_limit burst=5 nodelay;
        limit_conn conn_limit 5;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api {
        limit_req zone=api_limit burst=10 nodelay;
        limit_conn conn_limit 10;
        
        # CORS (solo para dominios permitidos)
        if ($http_origin ~* (https://docs\.amayo\.dev|https://amayo\.dev)) {
            add_header 'Access-Control-Allow-Origin' $http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Client-Token, X-Requested-With, X-Timestamp' always;
            add_header 'Access-Control-Expose-Headers' 'X-Server-Token' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
        }

        # Handle preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' $http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Client-Token, X-Requested-With, X-Timestamp' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            add_header 'Content-Type' 'text/plain charset=UTF-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Servir el archivo de configuración de la API
    location /.well-known/api-config.json {
        alias /var/www/api.amayo.dev/.well-known/api-config.json;
        add_header Content-Type application/json;
        add_header Cache-Control "public, max-age=3600";
    }

    # Bloquear acceso a archivos sensibles
    location ~ /\. {
        deny all;
        return 404;
    }

    # Bloquear acceso a archivos de backup
    location ~* \.(bak|backup|swp|tmp|log)$ {
        deny all;
        return 404;
    }
}

# Redirección HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.amayo.dev;
    
    # Solo permitir ACME challenge para Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirigir todo lo demás a HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
