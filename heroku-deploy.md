# 🚀 Heroku ile Deployment Rehberi

## 1️⃣ HEROKU CLI KURULUMU

### Windows:
```bash
# Heroku CLI indir: https://devcenter.heroku.com/articles/heroku-cli
# Veya Chocolatey ile:
choco install heroku-cli
```

### Mac:
```bash
brew tap heroku/brew && brew install heroku
```

### Linux:
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

## 2️⃣ HEROKU'YA GİRİŞ

```bash
# Heroku'ya giriş yap
heroku login

# Email ve şifreni gir
```

## 3️⃣ GIT REPOSİTORY OLUŞTUR

```bash
# Git repository başlat
git init

# Tüm dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit - Su Takip Uygulaması"
```

## 4️⃣ HEROKU APP OLUŞTUR

```bash
# Heroku app oluştur (benzersiz isim gerekli)
heroku create su-takip-app-2024

# VEYA kendi ismini ver
heroku create your-app-name
```

## 5️⃣ ENVIRONMENT VARIABLES AYARLA

```bash
# JWT Secret ayarla
heroku config:set JWT_SECRET=your-super-secret-jwt-key-here

# CORS Origin ayarla (Heroku URL'in)
heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com

# Node Environment
heroku config:set NODE_ENV=production
```

## 6️⃣ DEPLOY ET

```bash
# Heroku'ya push et
git push heroku main

# VEYA master branch ise
git push heroku master
```

## 7️⃣ UYGULAMAYI AÇ

```bash
# Uygulamayı tarayıcıda aç
heroku open

# VEYA logs kontrol et
heroku logs --tail
```

## 8️⃣ VERİTABANI AYARLARI

### SQLite Heroku'da çalışmaz! PostgreSQL kullan:

```bash
# PostgreSQL addon ekle (ücretsiz)
heroku addons:create heroku-postgresql:mini

# Veritabanı URL'ini al
heroku config:get DATABASE_URL
```

### PostgreSQL için database.js güncelle:

```javascript
// server/database-heroku.js
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// ... rest of the code
```

## 9️⃣ ALTERNATİF: SQLITE İLE (Dosya sistemi)

Eğer SQLite kullanmak istiyorsan:

```bash
# Ephemeral filesystem kullan
# Heroku'da dosyalar geçici, her restart'ta silinir
# Bu yüzden PostgreSQL önerilir
```

## 🔧 SORUN GİDERME

### A) Build Hatası
```bash
# Logs kontrol et
heroku logs --tail

# Build logs
heroku logs --tail --dyno web
```

### B) App Çalışmıyor
```bash
# Restart et
heroku restart

# Status kontrol et
heroku ps
```

### C) Database Bağlantı Hatası
```bash
# PostgreSQL URL kontrol et
heroku config:get DATABASE_URL

# Database reset
heroku pg:reset DATABASE_URL
```

## 📊 MONİTORİNG

```bash
# App durumu
heroku ps

# Logs
heroku logs --tail

# Metrics
heroku metrics
```

## 💰 FİYATLANDIRMA

- **Hobby**: $7/ay (7 gün uyku)
- **Basic**: $7/ay (sürekli çalışır)
- **Standard**: $25/ay (daha güçlü)

## 🎯 ÖZET ADIMLAR

1. ✅ Heroku CLI kur
2. ✅ `heroku login`
3. ✅ `git init`
4. ✅ `git add .`
5. ✅ `git commit -m "Initial commit"`
6. ✅ `heroku create your-app-name`
7. ✅ `heroku config:set JWT_SECRET=...`
8. ✅ `git push heroku main`
9. ✅ `heroku open`

## 🚨 ÖNEMLİ NOTLAR

1. **SQLite Heroku'da çalışmaz** - PostgreSQL kullan
2. **Dosya sistemi geçici** - Heroku'da dosyalar silinir
3. **Environment variables** - Heroku panelinden ayarla
4. **Port** - Heroku otomatik PORT verir
5. **HTTPS** - Heroku otomatik SSL sağlar

## 🔄 GÜNCELLEME

```bash
# Değişiklikleri commit et
git add .
git commit -m "Update app"

# Heroku'ya push et
git push heroku main
```

## 📞 DESTEK

Eğer sorun yaşarsan:
1. `heroku logs --tail` ile hata kontrol et
2. Heroku dashboard'dan metrics kontrol et
3. PostgreSQL bağlantısını kontrol et
