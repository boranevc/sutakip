const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// SQLite veritabanı oluştur
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'su-takip.db'),
  logging: false // SQL sorgularını konsola yazdırma
});

// Kullanıcı modeli
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dailyWaterGoal: {
    type: DataTypes.INTEGER,
    defaultValue: 2000
  },
  currentWaterIntake: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastResetDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Su kaydı modeli
const WaterLog = sequelize.define('WaterLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  note: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
}, {
  tableName: 'water_logs',
  timestamps: true
});

// İlişkileri tanımla
User.hasMany(WaterLog, { foreignKey: 'userId' });
WaterLog.belongsTo(User, { foreignKey: 'userId' });

// Veritabanını senkronize et
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false }); // force: true tüm tabloları siler ve yeniden oluşturur
    console.log('SQLite veritabanı başarıyla senkronize edildi!');
  } catch (error) {
    console.error('Veritabanı senkronizasyon hatası:', error);
  }
};

module.exports = {
  sequelize,
  User,
  WaterLog,
  syncDatabase
};
