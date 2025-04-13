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
    allowNull: false,
    comment: 'JSON string containing the core reconciliation data'
  },
  cashPaymentData: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'JSON string containing the cash payment data for each point of sale'
  },
  comments: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'JSON string mapping point of sale to comments'
  },
  calculated: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Indicates whether the reconciliation data was calculated or manually entered'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Schema version to handle future changes'
  }
}, {
  tableName: 'reconciliations',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['date']
    }
  ]
});

module.exports = Reconciliation; 