const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Estimation = sequelize.define('Estimation', {
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
  categorie: {
    type: DataTypes.STRING,
    allowNull: true
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stockMatin: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'stock_matin'
  },
  stockMatinOriginal: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'stock_matin_original'
  },
  transfert: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  transfertOriginal: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'transfert_original'
  },
  stockSoir: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'stock_soir'
  },
  stockSoirOriginal: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'stock_soir_original'
  },
  preCommandeDemain: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'pre_commande_demain'
  },
  previsionVentes: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'prevision_ventes'
  },
  difference: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  stockModified: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'stock_modified'
  },
  ventesTheoriques: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
    field: 'ventes_theoriques'
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'commentaire'
  }
}, {
  tableName: 'estimations',
  timestamps: true
});

module.exports = Estimation; 