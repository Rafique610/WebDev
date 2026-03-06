const express = require("express");
const session = require("express-session");

require("./database");

const User = require("./classes/User");
const auth = require("./middleware/auth");

const app = express();

app.use(express.json());

app.use(session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true
}));


/* REGISTER */
app.post("/register", async (req, res) => {

    const { username, password } = req.body;

    const user = new User(username, password);

    await user.register();

    res.send("User registered successfully");

});


/* LOGIN */
app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = new User(username, password);

    const result = await user.login();

    if (result) {

        req.session.user = username;

        res.send("Login successful");

    } 
    else {

        res.send("Invalid username or password");

    }

});


/* DASHBOARD (PROTECTED) */
app.get("/dashboard", auth, (req, res) => {

    res.send("Welcome " + req.session.user);

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