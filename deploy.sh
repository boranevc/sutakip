#!/bin/bash

# Su Takip Uygulaması Deployment Script
echo "🚀 Su Takip Uygulaması Deployment Başlıyor..."

# 1. Dependencies yükle
echo "📦 Dependencies yükleniyor..."
npm install

# 2. Client dependencies yükle
echo "📦 Client dependencies yükleniyor..."
cd client && npm install && cd ..

# 3. Production build oluştur
echo "🔨 Production build oluşturuluyor..."
cd client && npm run build && cd ..

# 4. Environment dosyasını kontrol et
if [ ! -f .env ]; then
    echo "⚠️  .env dosyası bulunamadı! env.example dosyasını kopyalayın ve düzenleyin."
    echo "cp env.example .env"
    exit 1
fi

# 5. Server başlat
echo "🚀 Production server başlatılıyor..."
NODE_ENV=production node server/index-production.js

echo "✅ Deployment tamamlandı!"
