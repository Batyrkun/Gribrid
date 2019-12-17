//jshint esversion:6

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");

mongoose.connect("mongodb+srv://admin-batyr:8ayaNTDd5AQ4zSw@cluster0-zdgrf.mongodb.net/userdata", {
  useNewUrlParser: true
});
const userSchema = {
  email: String,
  password: String
};
const User = new mongoose.model("User", userSchema);

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

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email: username}, function(err, foundUser){
    if (err){
      console.log(err);
      res.redirect("/login");
    } else {
      if (foundUser){
        if (foundUser.password === password){
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

app.listen(3000, function() {
  console.log("Server is running successfully");
});
