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
const mysql = require("mysql");

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
  googleId: String,
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

//new db for orders
var orderSchema = new mongoose.Schema({
  orderNumber: String,
  mushroomType: String,
  quantity: String,
  totalCost: String,
  firstName: String,
  lastName: String,
  address: String,
  email: String,
  telephone: String,
});
var Order = new mongoose.model('Order', orderSchema);

var ordernumber = 0;

//variables for searching
var phrase = "";
var box_class = "";
var li1 = "";
var li2 = "";
var display = "";
var price = "";

/* -------------------------------MYSQL---------------------------------*/
// const productNames = [];
//
// //creating connection with a mysql db
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'gribrid'
// });
//
// //connecting to the mysql db
// connection.connect((err) => {
//   if (err) throw err;
//   console.log('Connected to mysql gribrid db');
// });
//
// connection.query("select product_name, product_class, product_description, product_price, product_rating from product", (err, rows) => {
//   if (err) throw err;
//   rows.forEach((row) => {
//     let temp_productNames = [];
//     temp_productNames.push(row.product_name, row.product_class, row.product_description, row.product_price, row.product_rating);
//     productNames.push(temp_productNames);
//   });
// });
/* ---------------------------------------------------------------------*/

//array for sorting
const productNames = [
  ["Golden Oyster Mushroom", "limonka imageContainer", "a source of lipid-lowering drugs", "$5 USD per container(200g)", "7.5"],
  ["King Oyster Mushroom", "king imageContainer", "cholesterol-lowering agent", "$8 USD per container(200g)", "8.0"],
  ["Pink Oyster Mushroom", "pink imageContainer", "delicious and look incredible", "$7 USD per container(200g)", "6.5"]
];

// Merge Sort Implentation (Recursion)
function merge (left, right) {
  let resultArray = [], leftIndex = 0, rightIndex = 0;

  // We will concatenate values into the resultArray in order
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex][4] > right[rightIndex][4]) {
      resultArray.push(left[leftIndex]);
      leftIndex++; // move left array cursor
    } else {
      resultArray.push(right[rightIndex]);
      rightIndex++; // move right array cursor
    }
  }
  // We need to concat here because there will be one element remaining
  // from either left OR the right
  return resultArray
          .concat(left.slice(leftIndex))
          .concat(right.slice(rightIndex));
}

function mergeSort (unsortedArray) {
  // No need to sort the array if the array only has one element or empty
  if (unsortedArray.length <= 1) {
    return unsortedArray;
  }
  // In order to divide the array in half, we need to figure out the middle
  const middle = Math.floor(unsortedArray.length / 2);

  // This is where we will be dividing the array into left and right
  const left = unsortedArray.slice(0, middle);
  const right = unsortedArray.slice(middle);

  // Using recursion to combine the left and right
  return merge(
    mergeSort(left), mergeSort(right)
  );
}

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
    var x = mergeSort(productNamesSortedRating);
    res.render("shop_sort_by_rating", {
      productNamesSortedRating: x
    });
  }
});

app.post("/order", function(req, res) {
  mushroom_type = req.body.mushroom_type;
  var temp = mushroom_type.toLowerCase();
  switch (temp) {
    case "golden oyster mushroom":
      price = productNames[0][3];
      break;
    case "king oyster mushroom":
      price = productNames[1][3];
      break;
    case "pink oyster mushroom":
      price = productNames[2][3];
      break;
  }
  res.render("order", {
    mushroom_type: mushroom_type,
    price: price
  });
});

app.post("/order_issued", function(req, res) {
  var mushroom_type = req.body.mushroom_type;
  var quantity = req.body.quantity;
  var fname = req.body.fname;
  var lname = req.body.lname;
  var address = req.body.address;
  var email = req.body.email;
  var telephone = req.body.telephone;
  var temp = mushroom_type.toLowerCase();
  switch (temp) {
    case "golden oyster mushroom":
      price = 5;
      break;
    case "king oyster mushroom":
      price = 8;
      break;
    case "pink oyster mushroom":
      price = 7;
      break;
  }
  var totalCost = price * parseInt(quantity);

  Order.find(function(err, doc) {
    doc.forEach(function(orderNumber) {
      var temp2 = parseInt(orderNumber.orderNumber);
      if (temp2 > ordernumber) {
        ordernumber = temp2;
      }
    });
    ordernumber = ordernumber + 1;
    ordernumber.toString();
    Order.create({
      orderNumber: ordernumber,
      mushroomType: mushroom_type,
      quantity: quantity,
      totalCost: totalCost,
      firstName: fname,
      lastName: lname,
      address: address,
      email: email,
      telephone: telephone,
    });
    res.render("order_issued", {
      firstName: fname,
      lastName: lname,
      orderNumber: ordernumber,
      mushroomType: mushroom_type,
      quantity: quantity,
      address: address,
      email: email,
      telephone: telephone,
      totalCost: totalCost
    });
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server is running successfully");
});
