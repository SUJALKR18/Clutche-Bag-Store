const express = require('express');
const upload = require('../config/multer-config');
const { isLoggedIn } = require('../middlewares/isLoggedIn');
const productModel = require('../models/product-model');
const userModel = require('../models/user-model');
const router = express.Router();


router.get("/" , function(req ,res){
    let userCreated = req.flash("userCreated");
    let error = req.flash("error");
    res.render("index" , {userCreated , error , loggedin : false});
});

router.get("/shop" , isLoggedIn , async function(req ,res){
    let added = req.flash("added");
    let error = req.flash("error");
    let products = await productModel.find()
    res.render("shop" , { products , added , error});
})

router.get("/profile" , isLoggedIn , function(req ,res){
    let userData = req.user;
    res.render("profile" , {userData});
})

router.get("/edit" , isLoggedIn , function(req ,res){
    let userData = req.user;
    res.render("editUser" , {userData});
})

router.post("/editUser", isLoggedIn , upload.single('image'), async function (req, res) {
  try {
        const { fullname, contact } = req.body;
        await userModel.findOneAndUpdate(
        { email: req.user.email },
        { fullname, contact, image : req.file ? req.file.buffer : undefined},
        { new: true }
        );
        res.redirect("/profile");
    } catch (err) {
        console.error("Edit profile failed:", err);
        res.status(500).send("Something went wrong");
    }
});
  

router.get("/logout" , isLoggedIn , function(req, res){
    res.cookie("token" , '');
    res.redirect("/");
})

router.get("/addtocart/:productid" , isLoggedIn ,async function(req ,res){
    try{
        let user = await userModel.findOne({email : req.user.email});
        let productId = req.params.productid;
        if (!user.cart.includes(productId)) {
          user.cart.push(productId);
          await user.save();
          req.flash("added", "Added to cart successfully!");
          return res.redirect("/shop");
        } 
        else {
          req.flash("error", "Product is already in your cart.");
          return res.redirect("/shop");
        }
    }
    catch(err){
        return res.status(500).send(err.message);
    }
})

router.get("/cart" , isLoggedIn ,async function(req ,res){
    try{
        let removed = req.flash("removed")
        let user = await userModel.findOne({email : req.user.email}).populate('cart');
        res.render("cart", {
          cartItems: user.cart,
          userName: user.fullname,
          removed
        });
    }
    catch(err){
        return res.status(500).send(err.message);
    }
})

router.post("/remove-from-cart/:id" , isLoggedIn ,async function(req,res){
    let productId = req.params.id;
    let user = await userModel.findOne({email : req.user.email});
    const index = user.cart.indexOf(productId);
    if (index !== -1) {
      user.cart.splice(index, 1);
      await user.save();
      req.flash("removed", "Product removed successfully");
    }
    return res.redirect("/cart");
});

router.post("/checkout" , isLoggedIn , async function(req ,res){
    try{
        let user = await userModel.findOne({email : req.user.email}).populate('cart');
        res.render("checkout" , {
            cartItems : user.cart,
            fullname : user.fullname
        })
    }
    catch(err){
        res.status(500).send(err.messgae);
    }
})

router.post("/place-order", isLoggedIn, async function (req, res) {
    let user = await userModel
        .findOne({ email: req.user.email })
        .populate("cart");

    const billDetails = {
        fullname: req.body.fullname,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod,
        items: user.cart.map((item) => ({
            name: item.name,
            price: item.price,
            discount: item.discount,
        })),
        date: new Date(),
        orderId: "CLT-" + Date.now().toString().slice(-6),
        status: "Paid",
    };

    user.orders.push(billDetails);
    user.cart = [];
    await user.save();

    req.flash("order", "Order placed Successfully");
    let order = req.flash("order");

    res.render("bill", { billDetails, order });
});
    
    
module.exports = router;