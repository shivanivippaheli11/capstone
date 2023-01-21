'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      
    }
  
  static async getAllVoters(id) {
    return await voter.findAll({
      where: {
        electionid: id,
      },
    });
  }
  static async newVoter({voterid,password,electionid}){
    return await voter.create({
      voterid,
      password,
      electionid,
      voterstatus:false,
    })
  }
}
  voter.init({
    voterid: DataTypes.STRING,
    voterstatus: DataTypes.BOOLEAN,
    password: DataTypes.STRING,
    electionid:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'voter',
  });
  return voter;
};