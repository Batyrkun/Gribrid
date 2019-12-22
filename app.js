//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

 //setting up session via express-session
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));

//initializing session via passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://gribrid.herokuapp.com/auth/google/gribrid",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//connecting server to mongodb atlas
mongoose.connect("mongodb+srv://admin-batyr:8ayaNTDd5AQ4zSw@cluster0-zdgrf.mongodb.net/userdata", {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

//upgrading the deprecated method in mongoose
mongoose.set('useCreateIndex', true);

//creating new schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//adding plugins to the schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//creating the database "User" with the collection "users" via the schema
const User = new mongoose.model("User", userSchema);

//passport-local-mongoose adds the method that is responsible for the setup of passport-local LocalStrategy
passport.use(User.createStrategy());

//passport session support(local and google)
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/shop", function(req, res) {
  if (req.isAuthenticated()){
    res.render("shop");
  } else{
    res.redirect("/login");
  }
});

app.get("/about", function(req, res) {
  if (req.isAuthenticated()){
    res.render("about");
  } else{
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  //logout() is a method of passport
  req.logout();
  res.redirect("/");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] })
);

app.get('/auth/google/gribrid',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to about page.
    res.redirect('/about');
  });

app.post("/register", function(req, res) {
  //passport-local-mongoose adds a user data to the database
  User.register({username: req.body.username}, req.body.password, function(err, user){
    //checking for the errors
    if (err){
      console.log(err);
      res.redirect("/register");
    } else{
      //passport authenticates the user, if successful then the function is called
      passport.authenticate("local")(req, res, function(){
        res.redirect("/about");
      });
    }
  });
});

app.post("/login", function(req, res) {
  //taking username and password from request
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  //method login() of passport checks user data with a database
  req.login(user, function(err){
    if (err){
      console.log(err);
      res.redirect("/login");
    } else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/about");
      });
    }
  });
});

app.post("/search", function(req, res) {
  res.redirect("/shop");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server is running successfully");
});
