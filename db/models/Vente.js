const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Vente = sequelize.define('Vente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  mois: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semaine: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  preparation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: false
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prixUnit: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'prix_unit'
  },
  nombre: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  montant: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'ventes',
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  hooks: {
    beforeBulkCreate: async (instances, options) => {
      // Vérifier si les instances ont déjà un ID
      const hasIds = instances.some(instance => instance.id);
      
      // Si certaines instances ont un ID, nous devons nous assurer que la séquence est correctement mise à jour
      if (hasIds) {
        await sequelize.query('SELECT setval(pg_get_serial_sequence(\'ventes\', \'id\'), COALESCE((SELECT MAX(id) FROM ventes) + 1, 1), false)');
      }
    }
  }
});

module.exports = Vente; 