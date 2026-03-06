const UserModel = require("../models/UserModel");
const bcrypt = require("bcrypt");

class User {

    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    async register() {

        const existingUser = await UserModel.findOne({ username: this.username });

        if (existingUser) {
            return { success: false, message: "User already exists" };
        }

        const hashedPassword = await bcrypt.hash(this.password, 10);

        const user = new UserModel({
            username: this.username,
            password: hashedPassword
        });

        await user.save();

        return { success: true, message: "User registered successfully" };

    }

    async login() {

        const user = await UserModel.findOne({ username: this.username });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        const match = await bcrypt.compare(this.password, user.password);

        if (!match) {
            return { success: false, message: "Incorrect password" };
        }

        return { success: true, message: "Login successful" };

    }

}

module.exports = User;