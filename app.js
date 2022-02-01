// jshint esversion:8
const express = require("express");

// save session on MongoDB
const session = require("express-session");
const mongoDBSession = require("connect-mongodb-session")(session);

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const app = express();

const bcrypt = require('bcrypt');
const saltRounds = 10;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

// connect to moongose
mongoose.connect("mongodb://localhost:27017/myblogDB", {
  useNewUrlParser: true});

// app.use(bodyParser.urlencoded({extended: true}));
const store = new mongoDBSession({
  uri: "mongodb://localhost:27017/sessions",
  // collection: "mySessions",
});

app.use(session({
  secret: "Key that will sign cookie",
  resave: false,
  saveUninitialized:false,
  store: store
}));

// Schema
const postSchema = new mongoose.Schema({
  email:{
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  secret:{type: String}
});

// Moongose Model Using te Schema
const Post = mongoose.model("Post", postSchema);

// Render Home Page!!!
app.get("/", function(req, res) {
  res.render("home");
});

// login Route
app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  // Load hash from your password DB.
  const username = req.body.username;
  const password = req.body.password;

  Post.findOne({email:username},  function(err, foundUser){
    bcrypt.compare(password, foundUser.password, function(err, result) {
      if(!err){
        req.session.isAuth = true;
        console.log(foundUser.id);
        res.redirect("/secrets");
      }else{
        console.log(err);
      }
    });
  });
});

//register route
app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", async function(req, res) {
  const {username, password} = req.body;
  let user = await Post.findOne({email:username});
  if (user){
    return res.redirect("/register");
  }else{
  req.session.isAuth = true;
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const post = new Post({
      email: req.body.username,
      password: hash
    });
    // Store hash in your password DB.
    post.save(function(err) {
      if (!err) {
        res.redirect("/secrets");
      }
    });
  });}

});

//secrets route
app.get("/secrets", function(req, res) {
  // find users with secret fields not null
  Post.find({"secret":{$ne: null}}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if (foundUser){
        res.render("secrets", {userWithSecrets: foundUser});
      }
    }
  });
//  if(req.session.isAuth){
  //  res.render("secrets");
  // }else{
  //  res.redirect("login");
  //}
});

// logout route
app.get("/logout", function(req, res){
  req.session.destroy(function(err){
    if (!err){
      res.redirect("/");
    }
  });
});

// submit route
app.get("/submit", function(req, res) {
  if(req.session.isAuth){
    res.render("submit");
  }else{
    res.redirect("login");
  }
});

// submit route
app.post("/submit", function(req, res) {
    if (req.session.isAuth){
      secret = req.body.secret;
      username= req.body.email;
      Post.findOne({email:username}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          if (foundUser){
            foundUser.secret = secret;
            foundUser.save(function(){
              res.redirect("/");
            });
          }
        }
      });
    }
  //  console.log(req.body.id);
  //  res.redirect("/");
});


// Listen Route
app.listen(3000, (req, res) => {
  console.log("listening...");
});
