const express = require("express");
const router = express.Router();

router.get("/" , function(req ,res){
    res.send("Hello its owner page");
})

module.exports = router;