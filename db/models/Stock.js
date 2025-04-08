const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Stock = sequelize.define('Stock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  typeStock: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'type_stock'
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  prixUnitaire: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'prix_unitaire'
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stocks',
  timestamps: true
});

module.exports = Stock; 