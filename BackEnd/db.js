const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("meteorsDB", "root", "keos9838", {
  host: "localhost",
  dialect: "mysql",
  port: 3306,
});

module.exports = sequelize;
