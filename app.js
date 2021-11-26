require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = new express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(
    session({
        secret: "Out little secret.",
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userScheme = new mongoose.Schema({
    username: String,
    password: String,
});

userScheme.plugin(passportLocalMongoose);
// userScheme.plugin(encrypt, {secret: process.env.DB_SECRET_KEY, encryptedFields: ["password"]});
const User = mongoose.model("users", userScheme);
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.post("/register", async (req, res) => {
    try {
        User.register({ username: req.body.username }, req.body.password);
        await passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
        });
    } catch (error) {
        console.log(error);
        res.redirect("/register");
    }
});

app.post("/login", async (req, res) => {
    try {
        const user = new User({
            username: req.body.username,
            password: req.body.password,
        });
        req.login(user, (error) => {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        });
    } catch (error) {
        console.log(error);
        res.redirect("/login");
    }
});

app.listen(3000, () => {
    console.log("Server running at port 3000...");
});
