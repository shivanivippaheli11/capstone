"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("voters", "electionid", {
      type: Sequelize.DataTypes.INTEGER,
    });

  
    await queryInterface.sequelize.query(
      'ALTER TABLE "voters" ADD CONSTRAINT "Voters_electionId_Elections_fk" FOREIGN KEY ("electionid") REFERENCES "elections" (id) MATCH SIMPLE ON DELETE CASCADE'
    );
  },

  async down(queryInterface, Sequelize) {
    
    await queryInterface.removeColumn("voters", "electionid");
  },
};