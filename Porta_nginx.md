# Porta_nginx.md
# Arquitetura nginx-proxy — VPS Uid Software
> Documento para onboarding do Claude em novas conversas

---

## Contexto

O VPS da Uid Software (209.50.241.122) hospeda múltiplos projetos de clientes no mesmo servidor. Para que cada projeto seja independente e isolado, foi implementada uma arquitetura de **nginx-proxy como entrada única**.

---

## O problema

Em um VPS com um único IP, é impossível ter dois containers nginx escutando nas portas 80 e 443 ao mesmo tempo. O sistema operacional só permite um "dono" por porta.

---

## A solução — nginx-proxy

Um container nginx centralizado roda em **`network_mode: host`** e é o único que ocupa as portas 80 e 443. Ele roteia o tráfego por **nome de domínio** para o nginx interno de cada projeto.

```
Internet :80/:443
      ↓
 nginx-proxy  ← entrada única, roteia por domínio, gerencia SSL
      ↓                    ↓                    ↓
fluir-nginx:8001    uid-nginx:8002    cliente3-nginx:8003
      ↓                    ↓                    ↓
fluir-backend       uid-backend         cliente3-backend
```

---

## Localização dos arquivos

| Projeto | Diretório no VPS | Porta interna |
|---------|-----------------|---------------|
| nginx-proxy | `/var/www/nginx-proxy/` | 80 / 443 (host) |
| Studio Fluir | `/var/www/studio-fluir/` | 8001 |
| Uid Sistema | `/root/SystemD/` | 8002 |
| Próximo cliente | novo diretório | 8003+ |

---

## Como funciona o roteamento

Cada domínio tem um arquivo `.conf` em `/var/www/nginx-proxy/conf.d/`:

```
/var/www/nginx-proxy/conf.d/
├── studio-fluir.conf    → proxy_pass http://127.0.0.1:8001
├── uid-sistema.conf     → proxy_pass http://127.0.0.1:8002
└── cliente3.conf        → proxy_pass http://127.0.0.1:8003  ← novo cliente
```

Exemplo de server block para novo cliente:

```nginx
server {
    listen 80;
    server_name clienteX.com.br www.clienteX.com.br;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name clienteX.com.br www.clienteX.com.br;

    ssl_certificate     /etc/letsencrypt/live/clienteX.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clienteX.com.br/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Cada projeto — padrão de nginx interno

O nginx de cada projeto **não usa SSL** (o proxy-proxy assume) e é exposto apenas no loopback do host (`127.0.0.1:PORTA:80`), nunca acessível externamente de forma direta.

Exemplo do `docker-compose.prod.yml` de um projeto:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "127.0.0.1:8002:80"   # ← loopback only
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    - static_volume:/static
    - frontend_build:/usr/share/nginx/html
  restart: always
```

---

## SSL — como pegar certificado para novo cliente

O certbot do nginx-proxy usa o volume `nginx-proxy_certbot_www` para os desafios ACME. Para emitir um certificado novo:

```bash
# 1. Adicionar server block HTTP no conf.d (só o bloco listen 80 com o acme-challenge)
# 2. Recarregar o proxy
docker compose -C /var/www/nginx-proxy exec proxy nginx -s reload

# 3. Emitir o certificado
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v nginx-proxy_certbot_www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  --non-interactive --agree-tos \
  -m uidsoftwaretecnologia@gmail.com \
  -d clienteX.com.br -d www.clienteX.com.br

# 4. Adicionar o bloco HTTPS no conf.d
# 5. Recarregar o proxy
docker compose -C /var/www/nginx-proxy exec proxy nginx -s reload
```

---

## Renovação SSL automática

O container `certbot` no nginx-proxy roda em loop e renova todos os certificados automaticamente a cada 12h:

```yaml
certbot:
  image: certbot/certbot
  entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew --quiet; sleep 12h & wait; done"
```

---

## Checklist para adicionar novo cliente

- [ ] Criar diretório do projeto no VPS
- [ ] Definir porta interna (8003, 8004, ...)
- [ ] No `docker-compose.prod.yml` do projeto: nginx exposto em `127.0.0.1:PORTA:80`
- [ ] Nginx interno do projeto serve HTTP puro (sem SSL)
- [ ] Adicionar `clienteX.conf` em `/var/www/nginx-proxy/conf.d/` (bloco HTTP primeiro)
- [ ] Recarregar proxy
- [ ] Emitir certificado SSL via certbot
- [ ] Adicionar bloco HTTPS no conf
- [ ] Recarregar proxy
- [ ] Testar: `curl -sk -o /dev/null -w '%{http_code}' https://clienteX.com.br/`

---

## Por que essa arquitetura?

- **Isolamento total**: se o projeto A cair, o B nem sabe
- **Escalabilidade**: novo cliente = nova porta + um server block
- **SSL centralizado**: um certbot renova tudo
- **Custo**: múltiplos clientes dividem o mesmo VPS

---

*Uid Software e Tecnologia LTDA — Uberlândia/MG*
