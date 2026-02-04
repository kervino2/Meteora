const { DataTypes } = require("sequelize");
const db = require("../db");

const TiposMeteoritos = db.define("TiposMeteoritos", {
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  agrupado: {
    type: DataTypes.TEXT, // guardamos array en JSON
    allowNull: true,
  },
  urlImage: {
    type: DataTypes.STRING(5000),
    allowNull: true,
  },
  explicacion: {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  },
});

module.exports = TiposMeteoritos;
