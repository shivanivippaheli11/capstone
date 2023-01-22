'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      question.belongsTo(models.election, {
        foreignKey: "electionid",
      });
      
    }
    
    static async getAllQuestions(id) {
      return await question.findAll({
        where: {
          electionid:id,
        },
      });
    }

    static async newQuestion(data){
      try {
        return await this.create({
          queName: data.name,
          quedes: data.description,
          electionid: data.electionid,
        });
      } catch (error) {
        console.log(error);
      }
    }
    static async removeQuestion(id) {
      return this.destroy({
        where: {
          id,
        },
        cascade:true,
      });
    }
  }  
  question.init({
    queid: DataTypes.INTEGER,
    quedes: DataTypes.TEXT,
    queName: DataTypes.STRING,
    electionid:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'question',
  });
  return question;
};