const express = require("express");
const session = require("express-session");

const connectDB = require("./database");
const User = require("./classes/User");
const auth = require("./middleware/auth");

const app = express();

connectDB();

app.use(express.json());

app.use(session({
    secret: "secureSecretKey",
    resave: false,
    saveUninitialized: false
}));


/* REGISTER */
app.post("/register", async (req, res) => {

    const { username, password } = req.body;

    const user = new User(username, password);

    const result = await user.register();

    res.send(result.message);

});


/* LOGIN */
app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = new User(username, password);

    const result = await user.login();

    if (result.success) {

        req.session.user = username;

    }

    res.send(result.message);

});


/* DASHBOARD */
app.get("/dashboard", auth, (req, res) => {

    res.send(`Welcome ${req.session.user}`);

});


/* LOGOUT */
app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.send("Logout successful");

    });

});


app.listen(3000, () => {

    console.log("Server running on port 3000");

});