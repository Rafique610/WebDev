const UserModel = require("../models/UserModel");

class User {

    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    async register() {

        const newUser = new UserModel({
            username: this.username,
            password: this.password
        });

        await newUser.save();

        return true;
    }

    async login() {

        const user = await UserModel.findOne({
            username: this.username,
            password: this.password
        });

        if (user) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = User;