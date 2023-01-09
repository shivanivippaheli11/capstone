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
      // define association here
    }
    static getElections(){
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