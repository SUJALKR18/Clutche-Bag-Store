const express = require("express");
const upload = require("../config/multer-config");
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
// const axios = require('axios'); // REMOVED: No longer needed for API approach
const PDFDocument = require("pdfkit"); // ADDED: Import PDFDocument

// REMOVED: CONVERTAPI_SECRET and its check are no longer needed

router.get("/", function (req, res) {
  let userCreated = req.flash("userCreated");
  let error = req.flash("error");
  res.render("index", { userCreated, error, loggedin: false });
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

router.get("/profile", isLoggedIn, function (req, res) {
  let userData = req.user;
  res.render("profile", { userData });
});

router.get("/edit", isLoggedIn, function (req, res) {
  let userData = req.user;
  res.render("editUser", { userData });
});

router.post(
  "/editUser",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    try {
      const { fullname, contact } = req.body;
      await userModel.findOneAndUpdate(
        { email: req.user.email },
        { fullname, contact, image: req.file ? req.file.buffer : undefined },
        { new: true }
      );
      res.redirect("/profile");
    } catch (err) {
      console.error("Edit profile failed:", err);
      res.status(500).send("Something went wrong");
    }
  }
);

router.get("/logout", isLoggedIn, function (req, res) {
  res.cookie("token", "");
  res.redirect("/");
});

router.get("/addtocart/:productid", isLoggedIn, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    let productId = req.params.productid;
    let existingItem = user.cart.find(
      (item) => item.product.toString() === productId
    );
    if (existingItem) {
      existingItem.quantity += 1;
      req.flash("added", "Increased quantity in cart!");
    } else {
      user.cart.push({ product: productId, quantity: 1 });
      req.flash("added", "Added to cart successfully!");
    }
    await user.save();
    return res.redirect("/shop");
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.get("/shop/cart", isLoggedIn, async function (req, res) {
  try {
    let removed = req.flash("removed");
    let user = await userModel
      .findOne({ email: req.user.email })
      .populate("cart.product");
    res.render("cart", {
      cartItems: user.cart,
      userName: user.fullname,
      removed,
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.post("/remove-from-cart/:id", isLoggedIn, async function (req, res) {
  let productId = req.params.id;
  let user = await userModel.findOne({ email: req.user.email });
  user.cart = user.cart.filter((item) => item.product.toString() !== productId);
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
  } catch (err) {
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

router.get("/download-invoice/:orderId", isLoggedIn, async (req, res) => {
  try {
    const user = req.user;
    const orderId = req.params.orderId;

    const billDetails = user.orders.find((order) => order.orderId === orderId);
    if (!billDetails) {
      return res.status(404).send("Order not found");
    }

    const doc = new PDFDocument({ margin: 50 }); // Initialize PDFDocument with margins

    const filename = `Clutche_Invoice_${orderId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res); // Pipe the PDF directly to the response stream

    // --- Helper Function for Drawing Line ---
    const drawLine = (yPos) => {
      doc
        .strokeColor("#cccccc") // Lighter grey line
        .lineWidth(0.5)
        .moveTo(50, yPos)
        .lineTo(doc.page.width - 50, yPos)
        .stroke();
    };

    // --- PDF Content Generation using pdfkit ---

    // Top Header
    doc
      .fontSize(30)
      .fillColor("#333333")
      .font("Helvetica-Bold")
      .text("Clutche Invoice", { align: "center" })
      .moveDown(0.8);

    // Order ID and Date
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555555")
      .text(`Order ID: ${billDetails.orderId}`, { align: "right" });

    const orderDate = new Date(billDetails.date);
    // Format date to DD/MM/YYYY
    const formattedDate = `${orderDate.getDate()}/${
      orderDate.getMonth() + 1
    }/${orderDate.getFullYear()}`;
    doc.text(`Date: ${formattedDate}`, { align: "right" }).moveDown(1);

    drawLine(doc.y); // Horizontal line after header
    doc.moveDown(1);

    // Customer Information
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text("Customer Information", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Name: ${billDetails.fullname}`)
      .text(`Email: ${billDetails.email}`)
      .text(`Phone: ${billDetails.phone}`)
      .text(`Address: ${billDetails.address}`)
      .moveDown(1);

    // Payment Details
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text("Payment Details", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Method: ${billDetails.paymentMethod}`)
      .text(`Status: ${billDetails.status}`)
      .moveDown(1);

    drawLine(doc.y); // Horizontal line before items
    doc.moveDown(1);

    // Items Ordered Table
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text("Items Ordered", { underline: true })
      .moveDown(0.8);

    // Table Headers Positions
    const tableHeaderY = doc.y;
    const itemColX = 50;
    const qtyColX = 300;
    const priceColX = 380;
    const totalColX = 480;

    // Table Headers - REMOVED SUPERSCRIPT "1"
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Item", itemColX, tableHeaderY)
      .text("Qty", qtyColX, tableHeaderY, { width: 50, align: "center" })
      .text("Price (₹)", priceColX, tableHeaderY, { width: 80, align: "right" })
      .text("Total (₹)", totalColX, tableHeaderY, {
        width: 80,
        align: "right",
      });

    drawLine(tableHeaderY + 20); // Line under table headers
    doc.moveDown(0.5);

    let currentY = doc.y;
    let runningSubtotal = 0;
    let itemIndex = 1;

    doc.font("Helvetica").fontSize(10); // Smaller font for table content

    // Iterate over items and add to table
    billDetails.items.forEach((item) => {
      // Calculate item total considering discount
      const priceAfterDiscount = item.discount;
      const itemTotal = priceAfterDiscount * item.quantity;
      runningSubtotal += itemTotal;

      // Draw item row
      doc.text(`${itemIndex}. ${item.name}`, itemColX, currentY, {
        width: 240,
        continued: false,
      }); // Ensure enough width for item name
      doc.text(`${item.quantity}`, qtyColX, currentY, {
        width: 50,
        align: "center",
      });
      doc.text(`${item.price.toFixed(2)}`, priceColX, currentY, {
        width: 80,
        align: "right",
      });
      doc.text(`${itemTotal.toFixed(2)}`, totalColX, currentY, {
        width: 80,
        align: "right",
      });

      currentY += 20; // Move down for next item
      itemIndex++;

      // Handle page breaks
      // 700 is an approximate Y-coordinate near the bottom of an A4 page with 50 margin
      if (
        currentY > doc.page.height - 100 &&
        itemIndex <= billDetails.items.length
      ) {
        // Check if not the very last item
        doc.addPage();
        currentY = 50; // Reset Y for new page
        // Repeat table headers on new page - REMOVED SUPERSCRIPT "1"
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("Item", itemColX, currentY)
          .text("Qty", qtyColX, currentY, { width: 50, align: "center" })
          .text("Price (₹)", priceColX, currentY, { width: 80, align: "right" })
          .text("Total (₹)", totalColX, currentY, {
            width: 80,
            align: "right",
          });
        drawLine(currentY + 20);
        currentY += 30; // Move down after new page header
        doc.font("Helvetica").fontSize(10); // Reset font for content
      }
    });

    doc.y = currentY; // Update doc.y after loop
    drawLine(doc.y); // Line after items table
    doc.moveDown(1);

    // Summary Totals (FIXED ALIGNMENT and REMOVED SUPERSCRIPT "1")
    const shippingCost = 199.0; // Example fixed shipping cost
    const grandTotal = runningSubtotal + shippingCost;

    // Define a consistent right-aligned X position for the totals
    const summaryRightEdge = doc.page.width - 50; // Right margin
    const summaryTextWidth = 150; // Sufficient width for text, ensuring it stays within bounds
    const summaryTextX = summaryRightEdge - summaryTextWidth; // Calculate starting X for right alignment

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Subtotal: ₹${runningSubtotal.toFixed(2)}`, summaryTextX, doc.y, {
        align: "right",
        width: summaryTextWidth,
      })
      .moveDown(0.5)
      .text(`Shipping: ₹${shippingCost.toFixed(2)}`, summaryTextX, doc.y, {
        align: "right",
        width: summaryTextWidth,
      })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#000000") // Make total stand out
      .text(`Grand Total: ₹${grandTotal.toFixed(2)}`, summaryTextX, doc.y, {
        align: "right",
        width: summaryTextWidth,
      })
      .moveDown(2);

    drawLine(doc.y); // Final line before footer
    doc.moveDown(0.5);

    // Footer
    doc
      .fontSize(9)
      .fillColor("#777777")
      .font("Helvetica-Oblique") // Italicize footer text
      .text(
        "This is a system-generated invoice by Clutche. No signature required.",
        { align: "center" }
      );

    doc.end(); // Finalize the PDF and send it
  } catch (err) {
    console.error("PDF generation failed:", err);
    return res
      .status(500)
      .send("Something went wrong while generating invoice: " + err.message);
  }
});
module.exports = router;
