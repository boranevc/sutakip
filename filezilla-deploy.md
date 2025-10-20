# FileZilla ile Hosting Deployment Rehberi

## 1️⃣ HAZIRLIK AŞAMASI

### A) Dosyaları Hazırla
```bash
# 1. Production build oluştur
cd client && npm run build && cd ..

# 2. Gereksiz dosyaları sil
rm -rf node_modules
rm -rf client/node_modules
rm -rf .git
rm -rf client/src
rm -rf client/public
```

### B) .env Dosyasını Hazırla
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=https://yourdomain.com
```

## 2️⃣ FILEZILLA İLE YÜKLEME

### A) Bağlantı Ayarları
- **Host**: your-server-ip
- **Username**: your-username
- **Password**: your-password
- **Port**: 22 (SSH) veya 21 (FTP)

### B) Yüklenecek Dosyalar
```
📁 /public_html/ (veya /var/www/html/)
├── 📁 client/build/          # React build dosyaları
├── 📁 server/                # Backend dosyaları
│   ├── 📄 index-production.js
│   ├── 📄 database.js
│   ├── 📄 config.js
│   └── 📄 su-takip.db        # SQLite veritabanı
├── 📄 package.json
├── 📄 .env
└── 📄 ecosystem.config.js
```

## 3️⃣ SERVER'DA KURULUM

### A) SSH ile Bağlan
```bash
ssh user@your-server-ip
```

### B) Node.js Kur (Eğer yoksa)
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### C) PM2 Kur
```bash
sudo npm install -g pm2
```

### D) Uygulamayı Başlat
```bash
cd /path/to/your/app
npm install
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

## 4️⃣ NGINX AYARLARI

### A) Nginx Kur
```bash
sudo apt update
sudo apt install nginx
```

### B) Site Konfigürasyonu
```bash
sudo nano /etc/nginx/sites-available/su-takip
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### C) Site'ı Aktif Et
```bash
sudo ln -s /etc/nginx/sites-available/su-takip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5️⃣ SSL SERTİFİKASI

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 6️⃣ FİREWALL AYARLARI

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 7️⃣ MONİTORİNG

```bash
# PM2 durumu
pm2 status

# Logs
pm2 logs su-takip-app

# Restart
pm2 restart su-takip-app
```

## ⚠️ ÖNEMLİ NOTLAR

1. **SQLite Dosyası**: `server/su-takip.db` dosyası yüklenmeli
2. **Permissions**: Dosya izinleri doğru olmalı
3. **Environment**: `.env` dosyası server'da olmalı
4. **Port**: 5000 portu açık olmalı
5. **Domain**: DNS ayarları doğru olmalı

## 🔧 SORUN GİDERME

### A) Uygulama Çalışmıyor
```bash
pm2 logs su-takip-app
pm2 restart su-takip-app
```

### B) Port Sorunu
```bash
sudo netstat -tlnp | grep :5000
sudo lsof -i :5000
```

### C) Nginx Sorunu
```bash
sudo nginx -t
sudo systemctl status nginx
```

## 📞 DESTEK

Eğer sorun yaşarsan:
1. PM2 logs kontrol et
2. Nginx logs kontrol et
3. Firewall ayarlarını kontrol et
4. Domain DNS ayarlarını kontrol et
