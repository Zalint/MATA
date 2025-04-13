const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const CashPayment = sequelize.define('CashPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  merchant_fee: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  customer_fee: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entete_trans_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  psp_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_means: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  merchant_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trn_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tr_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cust_country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  aggregation_mt: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total_nom_marchand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total_marchand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  merchant_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name_first: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Additional fields for our application
  point_de_vente: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'cash_payments',
  timestamps: true
});

module.exports = CashPayment; 