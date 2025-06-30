const express = require("express");
const router = express.Router();
const {registerUser , loginUser} = require('../controllers/authControllers');
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const upload = require("../config/multer-config");

router.get("/" , function(req ,res){
    res.send("Hello its user page");
})

router.post("/register" , upload.single('profile'), registerUser);

router.get("/login-page" , function(req , res){
    let userCreated = req.flash("userCreated");
    let error = req.flash("error");
    res.render("login-page", { userCreated, error, loggedin: false });
})

router.post("/login" , loginUser);

module.exports = router;