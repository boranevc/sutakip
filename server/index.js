const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB bağlantısı
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB bağlantısı başarılı!');
}).catch((error) => {
  console.error('MongoDB bağlantı hatası:', error);
});

// Kullanıcı modeli
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dailyWaterGoal: { type: Number, default: 2000 }, // ml cinsinden
  currentWaterIntake: { type: Number, default: 0 }, // bugünkü su tüketimi
  lastResetDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Su kaydı modeli
const WaterLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // ml cinsinden
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' }
});

const WaterLog = mongoose.model('WaterLog', WaterLogSchema);

// JWT doğrulama middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token gerekli' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

// Kullanıcı kayıt
app.post('/api/register', [
  body('name').notEmpty().withMessage('İsim gerekli'),
  body('email').isEmail().withMessage('Geçerli email gerekli'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Email kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email zaten kullanılıyor' });
    }

    // Şifre hashleme
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Yeni kullanıcı oluştur
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user._id },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dailyWaterGoal: user.dailyWaterGoal,
        currentWaterIntake: user.currentWaterIntake
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Kullanıcı giriş
app.post('/api/login', [
  body('email').isEmail().withMessage('Geçerli email gerekli'),
  body('password').notEmpty().withMessage('Şifre gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz email veya şifre' });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Geçersiz email veya şifre' });
    }

    // Günlük sıfırlama kontrolü
    const today = new Date();
    const lastReset = new Date(user.lastResetDate);
    if (today.toDateString() !== lastReset.toDateString()) {
      user.currentWaterIntake = 0;
      user.lastResetDate = today;
      await user.save();
    }

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user._id },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dailyWaterGoal: user.dailyWaterGoal,
        currentWaterIntake: user.currentWaterIntake
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Kullanıcı profili getir
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Su ekleme
app.post('/api/water', authenticateToken, [
  body('amount').isNumeric().withMessage('Miktar sayısal olmalı'),
  body('amount').isFloat({ min: 1 }).withMessage('Miktar en az 1 ml olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, note } = req.body;

    // Su kaydı oluştur
    const waterLog = new WaterLog({
      userId: req.user.userId,
      amount,
      note
    });

    await waterLog.save();

    // Kullanıcının güncel su tüketimini güncelle
    const user = await User.findById(req.user.userId);
    user.currentWaterIntake += amount;
    await user.save();

    res.status(201).json({
      message: 'Su kaydı eklendi',
      waterLog,
      newTotal: user.currentWaterIntake
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Günlük su geçmişi
app.get('/api/water/history', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const waterLogs = await WaterLog.find({
      userId: req.user.userId,
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ timestamp: -1 });

    res.json(waterLogs);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Tüm kullanıcıları getir (sosyal özellik)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'name currentWaterIntake dailyWaterGoal createdAt')
      .sort({ currentWaterIntake: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Günlük hedef güncelleme
app.put('/api/goal', authenticateToken, [
  body('goal').isNumeric().withMessage('Hedef sayısal olmalı'),
  body('goal').isFloat({ min: 500 }).withMessage('Hedef en az 500 ml olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goal } = req.body;
    const user = await User.findById(req.user.userId);
    user.dailyWaterGoal = goal;
    await user.save();

    res.json({ message: 'Günlük hedef güncellendi', dailyWaterGoal: user.dailyWaterGoal });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Su kaydı silme
app.delete('/api/water/:id', authenticateToken, async (req, res) => {
  try {
    const waterLog = await WaterLog.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!waterLog) {
      return res.status(404).json({ message: 'Su kaydı bulunamadı' });
    }

    // Kullanıcının toplam su tüketiminden çıkar
    const user = await User.findById(req.user.userId);
    user.currentWaterIntake = Math.max(0, user.currentWaterIntake - waterLog.amount);
    await user.save();

    await WaterLog.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Su kaydı silindi',
      newTotal: user.currentWaterIntake
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
