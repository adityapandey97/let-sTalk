# ConnectChat Production Deployment Guide

This guide covers complete production deployment steps for ConnectChat using Java Spring Boot 3, MySQL 8, Nginx reverse proxy with SSL, and systemd or Docker.

---

## 1. Prerequisites
- **Operating System**: Ubuntu 22.04 LTS or any modern Linux / Windows Server
- **Runtime**: OpenJDK 17 or 21 LTS
- **Database**: MySQL 8.0+
- **Web Server**: Nginx 1.20+ (for reverse proxy, WebSocket upgrade, and SSL)
- **Certificates**: Let's Encrypt Certbot or custom SSL certificate

---

## 2. Database Setup (MySQL 8.0+)

Log in to MySQL and initialize the database and dedicated user:

```sql
CREATE DATABASE connectchat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'connectchat_user'@'localhost' IDENTIFIED BY 'StrongProductionPassword!2026';
GRANT ALL PRIVILEGES ON connectchat_db.* TO 'connectchat_user'@'localhost';
FLUSH PRIVILEGES;
```

Import schema and seed data (optional):
```bash
mysql -u connectchat_user -p connectchat_db < database/schema.sql
mysql -u connectchat_user -p connectchat_db < database/seed.sql
```

---

## 3. Building the Application

From the root directory:
```bash
# Clean, test and build production executable JAR
cd backend
./mvnw clean package -DskipTests
```
The executable JAR is produced at `backend/target/connectchat-1.0.0.jar`.

---

## 4. Production Environment Configuration

Create `/etc/connectchat/connectchat.env`:
```ini
PORT=8080
DB_URL=jdbc:mysql://localhost:3306/connectchat_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8
DB_DRIVER=com.mysql.cj.jdbc.Driver
DB_USERNAME=connectchat_user
DB_PASSWORD=StrongProductionPassword!2026
FILE_UPLOAD_PATH=/var/connectchat/uploads
MAX_FILE_SIZE=50MB
MAX_REQUEST_SIZE=50MB
AUTH_TOKEN_EXPIRY_HOURS=72
JWT_SECRET=c68e3f94b1a2491a92e624f110c9daec3081e81b6dc240c5f0b4d45be7592cf1
CORS_ALLOWED_ORIGINS=https://chat.yourdomain.com
HIBERNATE_DDL_AUTO=validate
```

Ensure upload directory permissions:
```bash
sudo mkdir -p /var/connectchat/uploads
sudo chown -R connectchat:connectchat /var/connectchat
```

---

## 5. Systemd Service Setup

Create `/etc/systemd/system/connectchat.service`:
```ini
[Unit]
Description=ConnectChat Real-Time Communication Platform
After=network.target mysql.service

[Service]
User=connectchat
Group=connectchat
EnvironmentFile=/etc/connectchat/connectchat.env
WorkingDirectory=/opt/connectchat
ExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar /opt/connectchat/connectchat-1.0.0.jar
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable connectchat
sudo systemctl start connectchat
sudo systemctl status connectchat
```

---

## 6. Nginx Reverse Proxy & WebSocket Configuration

Configure `/etc/nginx/sites-available/connectchat`:

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # Static uploads caching
    location /uploads/ {
        alias /var/connectchat/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # WebSocket STOMP endpoint
    location /ws {
        proxy_pass http://127.0.0.1:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # REST API and Static Frontend
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable configuration and reload:
```bash
sudo ln -s /etc/nginx/sites-available/connectchat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. WebRTC Production Considerations
For WebRTC audio and video calls across different networks or firewalls (NAT), configure STUN/TURN servers in `frontend/js/config.js` or through environment variables:
```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:turn.yourdomain.com:3478', username: 'user', credential: 'password' }
]
```
