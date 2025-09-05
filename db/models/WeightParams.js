const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const WeightParams = sequelize.define('WeightParams', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Un seul enregistrement par date
  },
  boeuf: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 150,
    field: 'boeuf_kg_per_unit'
  },
  veau: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 110,
    field: 'veau_kg_per_unit'
  },
  agneau: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 10,
    field: 'agneau_kg_per_unit'
  },
  poulet: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.5,
    field: 'poulet_kg_per_unit'
  },
  defaultWeight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1,
    field: 'default_kg_per_unit'
  }
}, {
  tableName: 'weight_params',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['date']
    }
  ]
});

module.exports = WeightParams;
