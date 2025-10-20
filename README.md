# 💧 Su Takip Uygulaması

Modern ve kullanıcı dostu bir su takip uygulaması. Kullanıcılar günlük su tüketimlerini takip edebilir, hedeflerini belirleyebilir ve diğer kullanıcılarla sosyal etkileşimde bulunabilir.

## ✨ Özellikler

- 🔐 **Kullanıcı Kayıt ve Giriş**: Güvenli kimlik doğrulama sistemi
- 💧 **Su Takibi**: Günlük su tüketimini kolayca takip etme
- 📊 **Görsel İlerleme**: Günlük hedefe ulaşma durumunu görsel olarak takip
- 👥 **Sosyal Özellikler**: Diğer kullanıcıların su tüketimini görme
- 📱 **Modern UI**: Material-UI ile tasarlanmış responsive arayüz
- 🎯 **Hedef Belirleme**: Kişiselleştirilebilir günlük su hedefleri
- 📈 **Geçmiş Takibi**: Günlük su tüketim geçmişi

## 🚀 Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd su-takip-uygulamasi
```

2. **Bağımlılıkları yükleyin**
```bash
npm run install-all
```

3. **Uygulamayı başlatın**

**Seçenek 1: SQLite ile (Önerilen - MongoDB gerekmez)**
```bash
# SQLite ile çalıştırma
npm run server-sqlite
npm run client
```

**Seçenek 2: MongoDB Atlas ile**
```bash
# MongoDB Atlas connection string'i config.js'e ekleyin
npm run dev
```

**Seçenek 3: Geliştirme modunda çalıştırma**
```bash
# Hem backend hem frontend
npm run dev
```

5. **Tarayıcıda açın**
```
http://localhost:3000
```

## 🛠️ Teknolojiler

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Veritabanı
- **Mongoose** - MongoDB ODM
- **JWT** - Kimlik doğrulama
- **bcryptjs** - Şifre hashleme

### Frontend
- **React** - UI framework
- **Material-UI** - UI component library
- **React Router** - Sayfa yönlendirme
- **Axios** - HTTP client
- **Context API** - State management

## 📁 Proje Yapısı

```
su-takip-uygulamasi/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React bileşenleri
│   │   ├── contexts/       # Context API
│   │   └── App.js         # Ana uygulama
├── server/                # Node.js backend
│   └── index.js           # Ana server dosyası
├── package.json           # Proje bağımlılıkları
└── README.md             # Bu dosya
```

## 🔧 API Endpoints

### Kimlik Doğrulama
- `POST /api/register` - Kullanıcı kaydı
- `POST /api/login` - Kullanıcı girişi
- `GET /api/profile` - Kullanıcı profili

### Su Takibi
- `POST /api/water` - Su ekleme
- `GET /api/water/history` - Su geçmişi
- `DELETE /api/water/:id` - Su kaydı silme
- `PUT /api/goal` - Hedef güncelleme

### Sosyal Özellikler
- `GET /api/users` - Tüm kullanıcılar

## 🎨 Ekran Görüntüleri

Uygulama şu ana bileşenlerden oluşur:
- **Giriş/Kayıt Sayfaları**: Modern tasarım ile kimlik doğrulama
- **Dashboard**: Su takip ana sayfası
- **İlerleme Çubuğu**: Günlük hedefe ulaşma durumu
- **Hızlı Su Ekleme**: Önceden tanımlı miktarlar
- **Kullanıcı Listesi**: Diğer kullanıcıların durumu
- **Geçmiş**: Günlük su tüketim kayıtları

## 🔒 Güvenlik

- JWT token tabanlı kimlik doğrulama
- Şifreler bcrypt ile hashlenir
- CORS koruması
- Input validasyonu

## 🚀 Geliştirme

### Yeni Özellik Ekleme
1. Backend API endpoint'lerini `server/index.js`'e ekleyin
2. Frontend bileşenlerini `client/src/components/`'e ekleyin
3. Context API'yi gerekirse güncelleyin

### Veritabanı Değişiklikleri
Mongoose şemalarını `server/index.js`'de güncelleyin.

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

Herhangi bir sorunuz veya öneriniz için issue açabilirsiniz.

---

**Not**: Bu uygulama eğitim amaçlı geliştirilmiştir. Üretim ortamında kullanmadan önce güvenlik önlemlerini gözden geçirin.
