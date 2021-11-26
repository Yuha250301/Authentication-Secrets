require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
const md5 = require("md5");
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = new express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
    express.urlencoded({
        extended: true,
    })
);
mongoose.connect("mongodb://localhost:27017/userDB");

const userScheme = new mongoose.Schema({
    username: String,
    password: String,
});

// userScheme.plugin(encrypt, {secret: process.env.DB_SECRET_KEY, encryptedFields: ["password"]});

const User = mongoose.model("users", userScheme);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register",  (req, res) => {

    bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        const newUser = new User({
        username: req.body.username,
        password: hash,
    });
    try {
        await newUser.save();
        res.render("secrets");
    } catch (error) {
        console.log(error);
    }
    });

    
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    try {
        const foundUser = await User.findOne({ username: username });
        const checkPass = await bcrypt.compare(password, foundUser.password);
        if (checkPass === true) {
            res.render("secrets");
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error);
    }
});

app.listen(3000, () => {
    console.log("Server running at port 3000...");
});
