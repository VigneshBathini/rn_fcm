import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Viz@2411",
  database: "fcm_app",
});

const [rows] = await db.query("SELECT 1");

console.log("Database connected:", rows);

export default db;