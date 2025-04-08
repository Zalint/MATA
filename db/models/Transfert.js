const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Transfert = sequelize.define('Transfert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
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
  impact: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transferts',
  timestamps: true
});

module.exports = Transfert; 