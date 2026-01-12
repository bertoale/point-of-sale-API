import { DataTypes } from "sequelize";
import supplier from "./supplier";
import user from "./user";

export default (sequelize) => {
  const User = sequelize.define(
    "Purchase",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
    },
    {
      tableName: "purchases",
      timestamps: true,
      paranoid: true,
    }
  );
  return User;
};
