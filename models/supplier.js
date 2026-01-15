import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define(
    "Supplier",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^[0-9+\-() ]+$/i,
        },
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      defaultScope: {
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
      tableName: "suppliers",
      timestamps: true,
      paranoid: true,
    }
  );
  return User;
};
