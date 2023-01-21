'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.addColumn("options","optCount",{
      type:Sequelize.DataTypes.INTEGER,
      defaultValue:0
    })
  },

  async down (queryInterface, Sequelize) {
    queryInterface.removeColumn("options","optCount")
  }
};
