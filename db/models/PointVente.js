const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const PointVente = sequelize.define('PointVente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'points_vente',
  timestamps: true
});

module.exports = PointVente;
