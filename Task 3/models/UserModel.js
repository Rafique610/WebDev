const mongoose = require("../database");

const UserSchema = new mongoose.Schema({
    username: String,
    password: String
});

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;