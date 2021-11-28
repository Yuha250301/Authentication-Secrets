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
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
    googleId: String,
    secret: String
});

userScheme.plugin(passportLocalMongoose);
userScheme.plugin(findOrCreate);

// userScheme.plugin(encrypt, {secret: process.env.DB_SECRET_KEY, encryptedFields: ["password"]});
const User = mongoose.model("users", userScheme);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/secrets",
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        },
        function (accessToken, refreshToken, profile, cb) {
            User.findOrCreate({ googleId: profile.id }, function (err, user, createdUser) {
                return cb(err, user);
            });
        }
    )
);

app.get("/", (req, res) => {
    res.render("home");
});

app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);
app.get(
    "/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/secrets");
    }
);

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", async (req, res) => {
    try {
        const users = await User.find({"secret": {$ne:null}});
        // console.log(users);
        res.render("secrets", {usersSecret: users});
    } catch (error) {
        console.log(err);
        res.redirect('/login');
    }
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.post("/register", async (req, res) => {
    try {
        await User.register({ username: req.body.username }, req.body.password);
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

app.post("/submit", async (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(()=>{
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.listen(3000, () => {
    console.log("Server running at port 3000...");
});
