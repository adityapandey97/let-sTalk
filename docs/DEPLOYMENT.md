# Let's Talk (ConnectChat) — Deployment Guide

This guide covers local setup and production deployment using Apache HTTP Server, MySQL 8, Java 17+, and SSL/TLS HTTPS.

---

## 1. Prerequisites
- **Java**: OpenJDK 17 LTS or 21 LTS
- **Build Tool**: Maven 3.8+ (or included `./mvnw` / `mvnw.cmd`)
- **Database**: MySQL 8.0+ (Development fallback: embedded persistent H2)
- **Web Server**: Apache HTTP Server 2.4+ (`httpd` or `apache2`) with `mod_ssl`, `mod_proxy`, `mod_proxy_http`, and `mod_proxy_wstunnel`
- **SSL Certificate**: Let's Encrypt Certbot or trusted CA certificate

---

## 2. Local Development Setup

### Quick Start (H2 Zero-Config Fallback)
The application is pre-configured to run out of the box with zero external dependencies using file-backed H2 in MySQL compatibility mode:
```powershell
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```
Open your browser at `http://localhost:8080`.

### MySQL 8.0 Database Setup
1. Create the database and user in MySQL:
   ```sql
   CREATE DATABASE connectchat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'connectchat_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
   GRANT ALL PRIVILEGES ON connectchat_db.* TO 'connectchat_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. Execute the schema:
   ```bash
   mysql -u connectchat_user -p connectchat_db < database/schema.sql
   ```
3. Set environment variables:
   ```bash
   export DB_URL="jdbc:mysql://localhost:3306/connectchat_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   export DB_DRIVER="com.mysql.cj.jdbc.Driver"
   export DB_USERNAME="connectchat_user"
   export DB_PASSWORD="YourSecurePassword123!"
   ```
4. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

---

## 3. Production Deployment Architecture Models

### Model B: Spring Boot Serves Frontend + Apache HTTPS Reverse Proxy (Recommended)
In this model, Spring Boot serves all static HTML/CSS/JS files directly from its classpath (`src/main/resources/static/`), and Apache HTTP Server acts as the public-facing HTTPS gateway and WebSocket upgrade proxy.

**Advantages**: Single deployable artifact (`.jar`), zero static file synchronization issues, unified routing.

#### Apache Virtual Host Configuration (`/etc/apache2/sites-available/letstalk.conf`):
```apache
<VirtualHost *:80>
    ServerName chat.yourdomain.com
    # Redirect all HTTP traffic to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName chat.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5

    # WebSocket Proxy for STOMP / SockJS
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/ws/(.*) ws://127.0.0.1:8080/ws/$1 [P,L]

    ProxyPass /ws/ ws://127.0.0.1:8080/ws/
    ProxyPassReverse /ws/ ws://127.0.0.1:8080/ws/

    # Proxy all REST API and Static Requests to Spring Boot
    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/

    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    ErrorLog ${APACHE_LOG_DIR}/letstalk_error.log
    CustomLog ${APACHE_LOG_DIR}/letstalk_access.log combined
</VirtualHost>
```

---

### Model A: Apache Serves Static Content + Proxies API & WebSocket
In this model, Apache serves static HTML/CSS/JS directly from `/var/www/letstalk/static` and reverse-proxies `/api` and `/ws` to Spring Boot.

#### Apache Virtual Host Configuration:
```apache
<VirtualHost *:443>
    ServerName chat.yourdomain.com
    DocumentRoot /var/www/letstalk/static

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem

    # Serve static assets directly
    <Directory /var/www/letstalk/static>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # Serve uploaded user media directly
    Alias /uploads /var/connectchat/uploads
    <Directory /var/connectchat/uploads>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    # WebSocket Proxy
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/ws/(.*) ws://127.0.0.1:8080/ws/$1 [P,L]

    ProxyPass /ws/ ws://127.0.0.1:8080/ws/
    ProxyPassReverse /ws/ ws://127.0.0.1:8080/ws/

    # Proxy REST API to Spring Boot
    ProxyPass /api http://127.0.0.1:8080/api
    ProxyPassReverse /api http://127.0.0.1:8080/api
</VirtualHost>
```

---

## 4. HTTPS & WebRTC Critical Requirements
> [!IMPORTANT]
> Modern browsers strictly restrict camera (`navigator.mediaDevices.getUserMedia`) and microphone permissions to **HTTPS** origins (or `localhost`). Plain HTTP deployment will prevent audio and video calling, and voice recording. Always configure HTTPS in production.

### WebRTC STUN / TURN Server Configuration
For peer-to-peer audio and video calling across restrictive NATs or symmetric corporate firewalls, a TURN server (such as `coturn`) should be deployed:
```bash
sudo apt-get install coturn
# Configure /etc/turnserver.conf with realm, listening-port=3478, and credentials
```
Add the TURN server to `window.APP_CONFIG.ICE_SERVERS` in `src/main/resources/static/js/api.js`:
```javascript
ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
        urls: 'turn:turn.yourdomain.com:3478',
        username: 'turnuser',
        credential: 'turnpassword'
    }
]
```

---

## 5. Systemd Production Service Setup

Create `/etc/systemd/system/letstalk.service`:
```ini
[Unit]
Description=Let's Talk Real-Time Communication Platform
After=network.target mysql.service

[Service]
User=connectchat
Group=connectchat
EnvironmentFile=/etc/letstalk/letstalk.env
WorkingDirectory=/opt/letstalk
ExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar /opt/letstalk/connectchat-1.0.0.jar
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable letstalk
sudo systemctl start letstalk
```
