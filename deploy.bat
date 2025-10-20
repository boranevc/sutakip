@echo off
echo 🚀 Su Takip Uygulaması Deployment Başlıyor...

REM 1. Dependencies yükle
echo 📦 Dependencies yükleniyor...
npm install

REM 2. Client dependencies yükle
echo 📦 Client dependencies yükleniyor...
cd client && npm install && cd ..

REM 3. Production build oluştur
echo 🔨 Production build oluşturuluyor...
cd client && npm run build && cd ..

REM 4. Environment dosyasını kontrol et
if not exist .env (
    echo ⚠️  .env dosyası bulunamadı! env.example dosyasını kopyalayın ve düzenleyin.
    echo copy env.example .env
    pause
    exit /b 1
)

REM 5. Server başlat
echo 🚀 Production server başlatılıyor...
set NODE_ENV=production
node server/index-production.js

echo ✅ Deployment tamamlandı!
pause
