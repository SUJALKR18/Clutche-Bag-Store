const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ownerModel = require("../models/owner-models");
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const { isOwner } = require("../middlewares/isLoggedIn");


router.post("/verify", async function (req, res) {
  let { email, password } = req.body;

  console.log("Login attempt by:", email); // <-- Add this
  let owner = await ownerModel.findOne({ email });

  if (!owner) {
    console.log("Owner not found in DB for email:", email); // <-- Debug
    return res.status(400).send("Owner not found");
  }

  if (owner.password !== password) {
    return res.status(401).send("Invalid credentials");
  }

  let token = jwt.sign(
    { id: owner._id, email: owner.email, role: "owner" },
    process.env.JWT_KEY,
    { expiresIn: "1d" }
  );
  res.cookie("token",token)
  res.redirect("/shop");
});
  

router.get("/admin", isOwner, async function (req, res) {
  let success = req.flash("success");
  res.render("createproducts", { success });
});
  

router.get("/login" , function(req ,res){
    res.render("owner-login" , {loggedin: false });
})
module.exports = router;
