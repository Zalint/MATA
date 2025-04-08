const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Reconciliation = sequelize.define('Reconciliation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  data: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  }
}, {
  tableName: 'reconciliations',
  timestamps: true
});

module.exports = Reconciliation; 