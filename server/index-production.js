const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { sequelize, User, WaterLog, syncDatabase } = require('./database-heroku');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();

// Middleware
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Authentication middleware
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
  body('name').trim().isLength({ min: 2 }).withMessage('İsim en az 2 karakter olmalı'),
  body('email').isEmail().withMessage('Geçerli bir email adresi girin'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user.id },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Kullanıcı oluşturuldu',
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
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
    } else {
      res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
  }
});

// Kullanıcı giriş
app.post('/api/login', [
  body('email').isEmail().withMessage('Geçerli bir email adresi girin'),
  body('password').notEmpty().withMessage('Şifre gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

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

// Kullanıcı profili
app.get('/api/profile', authenticateToken, checkDailyReset, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'name', 'email', 'dailyWaterGoal', 'currentWaterIntake']
    });

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Su ekleme
app.post('/api/water', authenticateToken, checkDailyReset, [
  body('amount').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount } = req.body;

    // Su kaydı oluştur
    const waterLog = await WaterLog.create({
      userId: req.user.userId,
      amount
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

// Günlük hedef güncelleme
app.put('/api/goal', authenticateToken, [
  body('goal').isInt({ min: 500, max: 10000 }).withMessage('Hedef 500-10000 ml arasında olmalı')
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

    res.json({ message: 'Hedef güncellendi', dailyWaterGoal: goal });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Su kaydı silme
app.delete('/api/water/:id', authenticateToken, async (req, res) => {
  try {
    const waterLogId = parseInt(req.params.id);
    const currentUserId = req.user.userId;

    const waterLog = await WaterLog.findOne({
      where: {
        id: waterLogId,
        userId: currentUserId
      }
    });

    if (!waterLog) {
      return res.status(404).json({ message: 'Su kaydı bulunamadı' });
    }

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
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Tüm kullanıcıları getir (sosyal özellik)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'dailyWaterGoal', 'currentWaterIntake'],
      order: [['currentWaterIntake', 'DESC']]
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Raporlar API'leri
app.get('/api/reports/daily', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let targetDate;
    
    if (date) {
      targetDate = new Date(date + 'T00:00:00.000Z');
    } else {
      targetDate = new Date();
    }
    
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

app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
  try {
    const { week } = req.query;
    let startOfWeek, endOfWeek;
    
    if (week) {
      const weekDate = new Date(week + 'T00:00:00.000Z');
      const utcWeekDate = new Date(weekDate.getTime() + (3 * 60 * 60 * 1000));
      startOfWeek = new Date(utcWeekDate);
      startOfWeek.setDate(utcWeekDate.getDate() - utcWeekDate.getDay());
      endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
    } else {
      const today = new Date();
      const utcToday = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      startOfWeek = new Date(utcToday);
      startOfWeek.setDate(utcToday.getDate() - utcToday.getDay());
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

app.get('/api/reports/monthly', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let targetMonth, targetYear;
    
    if (month && year) {
      targetMonth = parseInt(month) - 1;
      targetYear = parseInt(year);
    } else {
      const today = new Date();
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

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Database sync and server start
const startServer = async () => {
  try {
    await syncDatabase();
    app.listen(config.PORT, () => {
      console.log(`🚀 Server ${config.PORT} portunda çalışıyor (Production)`);
      console.log(`📊 SQLite veritabanı: ${config.SQLITE_PATH}`);
      console.log(`🌐 CORS Origin: ${config.CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('Server başlatma hatası:', error);
    process.exit(1);
  }
};

startServer();
