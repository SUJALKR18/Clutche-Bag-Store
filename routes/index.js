const express = require('express');
const upload = require('../config/multer-config');
const { isLoggedIn } = require('../middlewares/isLoggedIn');
const productModel = require('../models/product-model');
const userModel = require('../models/user-model');
const router = express.Router();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

router.get("/" , function(req ,res){
    let userCreated = req.flash("userCreated");
    let error = req.flash("error");
    res.render("index" , {userCreated , error , loggedin : false});
});

router.get("/shop", isLoggedIn, async function (req, res) {
    try {
        let added = req.flash("added");
        let error = req.flash("error");
        let sortBy = req.query.sort || "popular";

        let products = await productModel.find();

        if (sortBy === "priceLow") {
        products.sort((a, b) => a.price - b.price);
        } else if (sortBy === "priceHigh") {
        products.sort((a, b) => b.price - a.price);
        } else if (sortBy === "newest") {
        products = products.reverse();
        }

        res.render("shop", {
        products,
        added,
        error,
        sort: sortBy,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});
  

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

router.get("/addtocart/:productid", isLoggedIn, async function (req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        let productId = req.params.productid;
        let existingItem = user.cart.find((item) => item.product.toString() === productId);
        if (existingItem) {
            existingItem.quantity += 1;
            req.flash("added", "Increased quantity in cart!");
        } 
        else {
            user.cart.push({ product: productId, quantity: 1 });
            req.flash("added", "Added to cart successfully!");
        }
        await user.save();
        return res.redirect("/shop");
    } 
    catch (err) {
        return res.status(500).send(err.message);
    }
});
  

router.get("/shop/cart" , isLoggedIn ,async function(req ,res){
    try{
        let removed = req.flash("removed")
        let user = await userModel.findOne({email : req.user.email}).populate('cart.product');
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
    user.cart = user.cart.filter(item => item.product.toString() !== productId);
    await user.save();
    req.flash("removed", "Product removed successfully");
    return res.redirect("/shop/cart");
});

router.post("/checkout", isLoggedIn, async function (req, res) {
  try {
        const user = await userModel
        .findOne({ email: req.user.email })
        .populate("cart.product");

        const cartItems = user.cart.map((item) => {
        const product = item.product;
        return {
            name: product.name,
            price: product.price,
            discount: product.discount,
            quantity: item.quantity,
        };
        });

        res.render("checkout", {
        cartItems,
        fullname: user.fullname,
        email: user.email,
        });
    } 
    catch (err) {
        res.status(500).send(err.message);
    }
});
  

router.post("/place-order", isLoggedIn, async function (req, res) {
    const user = await userModel
        .findOne({ email: req.user.email })
        .populate("cart.product");

    const billDetails = {
        fullname: req.body.fullname,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod,
        items: user.cart.map((item) => ({
            name: item.product.name,
            price: item.product.price,
            discount: item.product.discount,
            quantity: item.quantity,
        })),
        date: new Date(),
        orderId: "CLT-" + Date.now().toString().slice(-6),
        status: "Paid",
    };

    user.orders.push(billDetails);
    user.cart = [];
    await user.save();

    req.flash("order", "Order placed Successfully");
    const order = req.flash("order");

    res.render("bill", { billDetails, order });
});
  

router.post("/increase-qty/:id", isLoggedIn, async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email });
    const item = user.cart.find((i) => i.product.toString() === req.params.id);
    if (item) item.quantity += 1;
    await user.save();
    res.redirect("/shop/cart");
});

router.post("/decrease-qty/:id", isLoggedIn, async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email });
    const item = user.cart.find((i) => i.product.toString() === req.params.id);
    if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            user.cart = user.cart.filter(
                (i) => i.product.toString() !== req.params.id
            );
        }
    }
    await user.save();
    res.redirect("/shop/cart");
});
  

router.get("/invoice/:orderId" , isLoggedIn , function(req ,res){
    let orderId = req.params.orderId;
    let user = req.user;
    let billDetails = user.orders.find(order => order.orderId === orderId);
    if (!billDetails) {
        return res.status(404).send("Order not found");
    }
    res.render("invoice", {
      billDetails,
      pdfMode: false, 
    });
      
    
})


router.get("/download-invoice/:orderId", isLoggedIn, async function (req, res) {
  try {
    const user = req.user;
    const orderId = req.params.orderId;

    const billDetails = user.orders.find((order) => order.orderId === orderId);
    if (!billDetails) {
      return res.status(404).send("Order not found");
    }

    const ejs = require("ejs");
    const path = require("path");
    const puppeteer = require("puppeteer");

    const invoicePath = path.join(__dirname, "../views/invoice.ejs");
    const html = await ejs.renderFile(invoicePath, {
      billDetails,
      pdfMode: true, // optional flag if you use conditional formatting
    });

    // ✅ Use the updated launch config here:
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: puppeteer.executablePath(), // 👈 Force Chrome path
    });
      
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "30px", right: "30px" },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Clutche_Invoice_${orderId}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed:", err);
    return res
      .status(500)
      .send("Something went wrong while generating the invoice.");
  }
});
  

module.exports = router;