import { DataTypes } from "sequelize";

export default (sequelize) => {
  const PurchaseDetail = sequelize.define(
    "PurchaseDetail",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      purchaseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: true,
          min: 1,
        },
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
    },
    {
      defaultScope: {
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
      tableName: "purchase_details",
      timestamps: true,
      paranoid: true,
    }
  );
  return PurchaseDetail;
};
