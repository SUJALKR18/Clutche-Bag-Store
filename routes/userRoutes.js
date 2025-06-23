const express = require("express");
const router = express.Router();
const {registerUser , loginUser} = require('../controllers/authControllers');

router.get("/" , function(req ,res){
    res.send("Hello its user page");
})

router.post("/register" , registerUser);

router.post("/login" , loginUser);

module.exports = router;