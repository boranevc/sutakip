const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, WaterLog, syncDatabase } = require('./database');
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Veritabanını başlat
syncDatabase();

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

// Günlük sayaç sıfırlama middleware
const checkDailyReset = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
      const user = await User.findByPk(req.user.userId);
      if (user) {
        const today = new Date();
        // Türkiye saatine göre ayarla (UTC+3)
        const utcToday = new Date(today.getTime() + (3 * 60 * 60 * 1000));
        const lastReset = new Date(user.lastResetDate);

        // Eğer son sıfırlama bugün değilse, sayaç sıfırla
        if (utcToday.toDateString() !== lastReset.toDateString()) {
          user.currentWaterIntake = 0;
          user.lastResetDate = utcToday;
          await user.save();
          console.log(`Günlük sayaç sıfırlandı - Kullanıcı: ${user.name}`);
        }
      }
    }
    next();
  } catch (error) {
    console.error('Günlük sıfırlama hatası:', error);
    next();
  }
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
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email zaten kullanılıyor' });
    }

    // Şifre hashleme
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Yeni kullanıcı oluştur
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user.id },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      token,
      user: {
        id: user.id,
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
    const user = await User.findOne({ where: { email } });
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
      { userId: user.id },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
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
app.get('/api/profile', authenticateToken, checkDailyReset, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Su ekleme
app.post('/api/water', authenticateToken, checkDailyReset, [
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
    const waterLog = await WaterLog.create({
      userId: req.user.userId,
      amount,
      note
    });

    // Kullanıcının güncel su tüketimini güncelle
    const user = await User.findByPk(req.user.userId);
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
    // Türkiye saatine göre ayarla (UTC+3)
    const utcToday = new Date(today.getTime() + (3 * 60 * 60 * 1000));
    const startOfDay = new Date(utcToday.getFullYear(), utcToday.getMonth(), utcToday.getDate());
    const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000));

    const waterLogs = await WaterLog.findAll({
      where: {
        userId: req.user.userId,
        createdAt: { [require('sequelize').Op.gte]: startOfDay, [require('sequelize').Op.lt]: endOfDay }
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(waterLogs);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Günlük rapor
app.get('/api/reports/daily', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let targetDate;
    
    if (date) {
      // Tarih string'ini UTC olarak parse et
      targetDate = new Date(date + 'T00:00:00.000Z');
    } else {
      targetDate = new Date();
    }
    
    // Türkiye saatine göre ayarla (UTC+3)
    const utcDate = new Date(targetDate.getTime() + (3 * 60 * 60 * 1000));
    const startOfDay = new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000));

    const waterLogs = await WaterLog.findAll({
      where: {
        userId: req.user.userId,
        createdAt: { [require('sequelize').Op.gte]: startOfDay, [require('sequelize').Op.lt]: endOfDay }
      },
      order: [['createdAt', 'ASC']]
    });

    const totalAmount = waterLogs.reduce((sum, log) => sum + log.amount, 0);
    const user = await User.findByPk(req.user.userId);

    res.json({
      date: startOfDay.toISOString().split('T')[0],
      totalAmount,
      goal: user.dailyWaterGoal,
      percentage: Math.round((totalAmount / user.dailyWaterGoal) * 100),
      logs: waterLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Haftalık rapor
app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
  try {
    const { week } = req.query;
    let startOfWeek, endOfWeek;
    
    if (week) {
      // Hafta tarihini UTC olarak parse et
      const weekDate = new Date(week + 'T00:00:00.000Z');
      // Türkiye saatine göre ayarla (UTC+3)
      const utcWeekDate = new Date(weekDate.getTime() + (3 * 60 * 60 * 1000));
      startOfWeek = new Date(utcWeekDate);
      startOfWeek.setDate(utcWeekDate.getDate() - utcWeekDate.getDay()); // Pazar
      endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
    } else {
      const today = new Date();
      // Türkiye saatine göre ayarla (UTC+3)
      const utcToday = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      startOfWeek = new Date(utcToday);
      startOfWeek.setDate(utcToday.getDate() - utcToday.getDay()); // Bu haftanın başı (Pazar)
      endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
    }

    const waterLogs = await WaterLog.findAll({
      where: {
        userId: req.user.userId,
        createdAt: { [require('sequelize').Op.gte]: startOfWeek, [require('sequelize').Op.lt]: endOfWeek }
      },
      order: [['createdAt', 'ASC']]
    });

    // Günlere göre grupla
    const dailyData = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayStr = day.toISOString().split('T')[0];
      dailyData[dayStr] = 0;
    }

    waterLogs.forEach(log => {
      const day = log.createdAt.toISOString().split('T')[0];
      if (dailyData.hasOwnProperty(day)) {
        dailyData[day] += log.amount;
      }
    });

    const totalAmount = waterLogs.reduce((sum, log) => sum + log.amount, 0);
    const user = await User.findByPk(req.user.userId);
    const weeklyGoal = user.dailyWaterGoal * 7;

    res.json({
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: new Date(endOfWeek.getTime() - 1).toISOString().split('T')[0],
      totalAmount,
      goal: weeklyGoal,
      percentage: Math.round((totalAmount / weeklyGoal) * 100),
      dailyData,
      logs: waterLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Aylık rapor
app.get('/api/reports/monthly', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let targetMonth, targetYear;
    
    if (month && year) {
      targetMonth = parseInt(month) - 1;
      targetYear = parseInt(year);
    } else {
      const today = new Date();
      // Türkiye saatine göre ayarla (UTC+3)
      const utcToday = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      targetMonth = utcToday.getMonth();
      targetYear = utcToday.getFullYear();
    }
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 1);

    const waterLogs = await WaterLog.findAll({
      where: {
        userId: req.user.userId,
        createdAt: { [require('sequelize').Op.gte]: startOfMonth, [require('sequelize').Op.lt]: endOfMonth }
      },
      order: [['createdAt', 'ASC']]
    });

    // Haftalara göre grupla
    const weeklyData = {};
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const weekNumber = Math.ceil(day / 7);
      const weekKey = `Hafta ${weekNumber}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = 0;
      }
    }

    waterLogs.forEach(log => {
      const day = log.createdAt.getDate();
      const weekNumber = Math.ceil(day / 7);
      const weekKey = `Hafta ${weekNumber}`;
      
      if (weeklyData[weekKey] !== undefined) {
        weeklyData[weekKey] += log.amount;
      }
    });

    const totalAmount = waterLogs.reduce((sum, log) => sum + log.amount, 0);
    const user = await User.findByPk(req.user.userId);
    const monthlyGoal = user.dailyWaterGoal * daysInMonth;

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      totalAmount,
      goal: monthlyGoal,
      percentage: Math.round((totalAmount / monthlyGoal) * 100),
      weeklyData,
      logs: waterLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Tüm kullanıcıları getir (sosyal özellik)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'currentWaterIntake', 'dailyWaterGoal', 'createdAt'],
      order: [['currentWaterIntake', 'DESC']]
    });
    
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
    const user = await User.findByPk(req.user.userId);
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
    const waterLogId = parseInt(req.params.id);
    const currentUserId = req.user.userId;
    
    console.log(`Su kaydı silme isteği - ID: ${waterLogId}, Kullanıcı ID: ${currentUserId}`);
    
    const waterLog = await WaterLog.findOne({
      where: {
        id: waterLogId,
        userId: currentUserId
      }
    });

    if (!waterLog) {
      console.log(`Su kaydı bulunamadı - ID: ${waterLogId}, Kullanıcı ID: ${currentUserId}`);
      return res.status(404).json({ message: 'Su kaydı bulunamadı' });
    }
    
    console.log(`Su kaydı bulundu - ID: ${waterLogId}, Miktar: ${waterLog.amount}, Kullanıcı ID: ${waterLog.userId}`);

    // Kullanıcının toplam su tüketiminden çıkar
    const user = await User.findByPk(req.user.userId);
    user.currentWaterIntake = Math.max(0, user.currentWaterIntake - waterLog.amount);
    await user.save();

    await waterLog.destroy();

    res.json({ 
      message: 'Su kaydı silindi',
      newTotal: user.currentWaterIntake
    });
  } catch (error) {
    console.error('Su kaydı silme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor (SQLite)`);
});
