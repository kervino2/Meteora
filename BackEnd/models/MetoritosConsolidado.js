// models/MeteorMatches.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const MeteorMatches = db.define("MeteorMatches", {
  name: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },
  fall: { type: DataTypes.STRING },
  year: { type: DataTypes.STRING },
  place: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  mass: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING },

  basic_name: { type: DataTypes.STRING },
  basic_abbrev: { type: DataTypes.STRING },
  basic_fall: { type: DataTypes.STRING },
  basic_yearFound: { type: DataTypes.STRING },
  basic_country: { type: DataTypes.STRING },

  classification: { type: DataTypes.STRING },
  coordinadesExact: { type: DataTypes.STRING },
  coordinadesLat: { type: DataTypes.STRING },
  coordinadesLon: { type: DataTypes.STRING },
  coordinadesRecomend: { type: DataTypes.STRING },
  coordinadesLatRecomend: { type: DataTypes.STRING },
  coordinadesLonRecomend: { type: DataTypes.STRING },

  dataMB109_Lat: { type: DataTypes.STRING },
  dataMB109_Lon: { type: DataTypes.STRING },
  dataMB109_Mass: { type: DataTypes.STRING },
  dataMB109_Piece: { type: DataTypes.STRING },
  dataMB109_Class: { type: DataTypes.STRING },
  dataMB109_Weathering: { type: DataTypes.TEXT  },
  dataMB109_Fayalite: { type: DataTypes.TEXT  },
  dataMB109_Ferrosilite: { type: DataTypes.TEXT  },
  dataMB109_Classifier: { type: DataTypes.TEXT  },
  dataMB109_Main_mass: { type: DataTypes.TEXT  },
  dataMB109_Coments: { type: DataTypes.TEXT },

  impact_date: { type: DataTypes.STRING },
  impact_lat: { type: DataTypes.STRING },
  impact_lon: { type: DataTypes.STRING },
  impact_alt: { type: DataTypes.STRING },
  impact_vel: { type: DataTypes.STRING },
  impact_energy: { type: DataTypes.STRING },
  impact_e: { type: DataTypes.STRING },

  metBull_fotos: { type: DataTypes.JSON }, // array de objetos [{autor, referencia, link}]
  mass_num: { type: DataTypes.FLOAT },
  year_num: { type: DataTypes.INTEGER },
  tiene_fotos: { type: DataTypes.BOOLEAN },

  ia_nombre: { type: DataTypes.TEXT },
  ia_historia: { type: DataTypes.TEXT },
  ia_importancia: { type: DataTypes.TEXT },
  ia_descubrimiento: { type: DataTypes.TEXT },
  ia_impacto: { type: DataTypes.TEXT },
  ia_velocidad: { type: DataTypes.TEXT },
  ia_energia: { type: DataTypes.TEXT },
  ia_links: { type: DataTypes.TEXT },
  ia_fotos: { type: DataTypes.TEXT },
  ia_videos: { type: DataTypes.TEXT },
}, {
  timestamps: true, // Crea createdAt y updatedAt
  tableName: "Meteoritos",
});

module.exports = MeteorMatches;
