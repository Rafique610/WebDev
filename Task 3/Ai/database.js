const mongoose = require("mongoose");

async function connectDB() {

    try {

        await mongoose.connect("mongodb://127.0.0.1:27017/studentDB");

        console.log("Database connected successfully");

    } catch (error) {

        console.log("Database connection failed:", error);

    }

}

module.exports = connectDB;