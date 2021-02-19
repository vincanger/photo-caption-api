'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Caption extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User }) {
      this.belongsTo(User, { foreignKey: 'user_id' })
    }
  };
  Caption.init({
    pic_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    caption: DataTypes.STRING,
    pic_file_name: DataTypes.STRING,
  }, {
    sequelize,
    tableName: 'captions',
    modelName: 'Caption',
  });
  return Caption;
};