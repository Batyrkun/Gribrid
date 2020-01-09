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
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
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

//creating new schema about users
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
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

//new db for ratings
var ratingSchema = new mongoose.Schema({
  name: String,
  rating: Number
});
var Rating = new mongoose.model('Rating', ratingSchema);
var silence = new Rating({
  name: "King Oyster Mushroom",
  rating: 6.5
});

//variables for searching
var phrase = "";
var box_class = "";
var li1 = "";
var li2 = "";
var display = "";

//array for sorting
const productNames = [
  ["Golden Oyster Mushroom", "limonka imageContainer", "a source of lipid-lowering drugs", "$5.23 USD per kg"],
  ["King Oyster Mushroom", "king imageContainer", "cholesterol-lowering agent", "$8.18 USD per kg"],
  ["Pink Oyster Mushroom", "pink imageContainer", "delicious and look incredible", "$7.41 USD per kg"]  
];

//pushing ratings from mongodb to the array
productNames.forEach(function(item) {
  Rating.find({
    name: item[0]
  }, function(err, docs) {
    docs.forEach(function(doc) {
      item.push(doc.rating.toString());
    });
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
  if (req.isAuthenticated()) {
    res.render("shop", {
      productNames: productNames
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/about", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("about");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res) {
  //logout() is a method of passport
  req.logout();
  res.redirect("/");
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ['profile']
  })
);

app.get('/auth/google/gribrid',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect to about page.
    res.redirect('/about');
  });

app.post("/register", function(req, res) {
  //passport-local-mongoose adds a user data to the database
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    //checking for the errors
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      //passport authenticates the user, if successful then the function is called
      passport.authenticate("local")(req, res, function() {
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
  req.login(user, function(err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/about");
      });
    }
  });
});

app.post("/search", function(req, res) {
  phrase = req.body.q.toLowerCase();
  switch (phrase) {
    case "golden oyster mushroom":
      phrase = productNames[0][0];
      box_class = productNames[0][1];
      li1 = productNames[0][2];
      li2 = productNames[0][3];
      rating = productNames[0][4];
      display = "display: inline-block;";
      break;

    case "king oyster mushroom":
      phrase = productNames[1][0];
      box_class = productNames[1][1];
      li1 = productNames[1][2];
      li2 = productNames[1][3];
      rating = productNames[1][4];
      display = "display: inline-block;";
      break;

    case "pink oyster mushroom":
      phrase = productNames[2][0];
      box_class = productNames[2][1];
      li1 = productNames[2][2];
      li2 = productNames[2][3];
      rating = productNames[2][4];
      display = "display: inline-block;";
      break;

    default:
      display = "display: none;";
  }
  res.render("shop_search", {
    phrase: phrase,
    box_class: box_class,
    li1: li1,
    li2: li2,
    display: display,
    rating: rating
  });
});

app.post("/sort", function(req, res) {
  var sortType = req.body.selectedOption;
  if (sortType === "A-Z") {
    const productNamesSortedAtoZ = Array.from(productNames);
    productNamesSortedAtoZ.sort();
    res.render("shop_sort_by_a-z", {
      productNamesSortedAtoZ: productNamesSortedAtoZ
    });
  }
  if (sortType === "Rating") {
    const productNamesSortedRating = Array.from(productNames);
    var swapp;
    var n = productNamesSortedRating.length - 1;
    var x = productNamesSortedRating;
    do {
      swapp = false;
      for (var i = 0; i < n; i++) {
        if (x[i][4] < x[i + 1][4]) {
          var temp = x[i];
          x[i] = x[i + 1];
          x[i + 1] = temp;
          swapp = true;
        }
      }
      n--;
    } while (swapp);
    res.render("shop_sort_by_rating", {
      productNamesSortedRating: x
    });
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server is running successfully");
});
