'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      election.hasMany(models.question, {
        onDelete: "CASCADE",
        foreignKey: "electionid",
      });
    }
    static getElection(){
      return election.findAll()
    }

    static async newElection({name}){
      try {
        return await this.create({  electionstatus: false,electionname: name });
      } catch (error) {
        console.log(error);
      }
    }
    static async deleteElection(id) {
      return await this.destroy({
        where: {
          id,
        },
      });
    }
    static async getAllOnGoingElections() {
      return await election.findAll({
        where: {
          onGoingStatus: true,
        },
      });
    }
    static async checkStatus(id) {
      const election = await election.findByPk(id);
      return election.onGoingStatus;
    }
  
  }
  election.init({
    electionid: DataTypes.STRING,
    electionstatus: DataTypes.BOOLEAN,
    electionname: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'election',
  });
  return election;
};