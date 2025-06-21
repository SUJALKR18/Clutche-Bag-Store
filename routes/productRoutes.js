const express = require("express");
const router = express.Router();

router.get("/" , function(req ,res){
    res.send("Hello its product page");
})

module.exports = router;