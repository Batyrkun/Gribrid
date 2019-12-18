//jshint esversion:6
require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
app.use(passport.initialize());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");

mongoose.connect("mongodb+srv://admin-batyr:8ayaNTDd5AQ4zSw@cluster0-zdgrf.mongodb.net/userdata", {
  useNewUrlParser: true
});
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
userSchema.plugin(encrypt, {
  secret: process.env.SECRET,
  encryptedFields: ['password']
});
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/gribrid",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/gribrid',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    res.redirect('/about');
  });

app.get("/shop", function(req, res) {
  res.render("shop");
});

app.get("/about", function(req, res) {
  res.render("about");
});

app.post("/register", function(req, res) {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
  newUser.save(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({
    email: username
  }, function(err, foundUser) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      if (foundUser) {
        if (foundUser.password === password) {
          res.redirect("about");
        } else {
          res.redirect("/login");
        }
      } else {
        res.redirect("/login");
      }
    }
  });
});

app.post("/shop", function(req, res) {
  res.redirect("/shop");
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server is running successfully");
});
