import { Sequelize, DataTypes } from "sequelize";
import { Config } from "../configs/config.js";

import UserModel from "./user.js";
import CategoryModel from "./category.js";
import productModel from "./product.js";
import supplierModel from "./supplier.js";
import purchaseModel from "./purchase.js";
import purchaseDetailModel from "./purchaseDetail.js";
import saleModel from "./sale.js";
import saleDetailModel from "./saleDetail.js";

const sequelize = new Sequelize(
  Config.DB_NAME,
  Config.DB_USER,
  Config.DB_PASSWORD,
  {
    host: Config.DB_HOST,
    dialect: Config.DB_DIALECT,
    port: Config.DB_PORT,
    logging: Config.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: "+08:00",
    dialectOptions: {
      timezone: "+08:00",
    },
  }
);

const User = UserModel(sequelize);
const Category = CategoryModel(sequelize);
const Product = productModel(sequelize);
const Supplier = supplierModel(sequelize);
const Purchase = purchaseModel(sequelize);
const PurchaseDetail = purchaseDetailModel(sequelize);
const Sale = saleModel(sequelize);
const SaleDetail = saleDetailModel(sequelize);

// =============================
// 🔗 Associations
// =============================
//category - product
Category.hasMany(Product, { foreignKey: "categoryId" });
Product.belongsTo(Category, { foreignKey: "categoryId" });
//supplier - purchase
Supplier.hasMany(Purchase, { foreignKey: "supplierId" });
Purchase.belongsTo(Supplier, { foreignKey: "supplierId" });
//purchase - purchaseDetail
Purchase.hasMany(PurchaseDetail, { foreignKey: "purchaseId" });
PurchaseDetail.belongsTo(Purchase, { foreignKey: "purchaseId" });
//product - purchaseDetail
Product.hasMany(PurchaseDetail, { foreignKey: "productId" });
PurchaseDetail.belongsTo(Product, { foreignKey: "productId" });
//sale - saleDetail
Sale.hasMany(SaleDetail, { foreignKey: "saleId" });
SaleDetail.belongsTo(Sale, { foreignKey: "saleId" });
//product - saleDetail
Product.hasMany(SaleDetail, { foreignKey: "productId" });
SaleDetail.belongsTo(Product, { foreignKey: "productId" });
// user - purchase
User.hasMany(Purchase, { foreignKey: "userId" });
Purchase.belongsTo(User, { foreignKey: "userId" });
// user - sale
User.hasMany(Sale, { foreignKey: "userId" });
Sale.belongsTo(User, { foreignKey: "userId" });

// =============================
// Export semua models
// =============================
export {
  User,
  Category,
  Product,
  Supplier,
  Purchase,
  PurchaseDetail,
  Sale,
  SaleDetail,
  sequelize,
  Sequelize,
};
