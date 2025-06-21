const express = require("express");
const router = express.Router();
const ownerModel = require('../models/owner-models');

if (process.env.NODE_ENV === "development") {
    router.post("/create", async function (req, res) {
        let owners = await ownerModel.find();
        if (owners.length > 0){
            return res
            .status(500)
            .send("You can't create a new user");
        }
        let {fullname , email , password} = req.body;
        let owner = await ownerModel.create({
            fullname ,
            email ,
            password
        });
        res.status(201).send(owner);
    });
}


router.get("/" , function(req ,res){
    res.send("Hello its owner page");
})

module.exports = router;