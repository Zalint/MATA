const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const AchatBoeuf = sequelize.define('achat_boeuf', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mois: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  bete: {
    type: DataTypes.STRING,
    allowNull: true
  },
  prix: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  abats: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  frais_abattage: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  nbr_kg: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  prix_achat_kg: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  annee: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'achats_boeuf'
});

module.exports = AchatBoeuf; 