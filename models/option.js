'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class option extends Model {

    static associate(models) {
      option.belongsTo(models.question, {
        foreignKey: "questionId",
      });
    }
    static async getoptions(id){
      try {
        return await this.findAll({where :
          {
          questionId:id

          }});
      } catch (error) {
        console.log(error);
      }
    }
    static async update(id, name) {
      return await option.update(
        { optionname: name },
        {
          where: {
            id,
          },
        }
      );
    }
    static async addoption({optName,questionId}) {
      try {
        return await this.create({
          optName,
          questionId
        });
      } catch (error) {
        console.log(error);
      }
    }
    static async createoption({questionId, name}) {
      return await option.create(
        {
          optionname:name,
          questionId
        }
      );
    }
    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
  }
  
}
   
  option.init({
    optId: DataTypes.INTEGER,
    optName: DataTypes.STRING,
    optCount:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'option',
  });
  return option;
};