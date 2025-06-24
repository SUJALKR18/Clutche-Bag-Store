const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");
const ownerModel = require("../models/owner-models");

module.exports.isLoggedIn = async function (req, res, next) {
  if (!req.cookies.token || req.cookies.token === "undefined") {
    req.flash("error", "You need to login first");
    return res.redirect("/");
  }

  try {
    const data = jwt.verify(req.cookies.token, process.env.JWT_KEY);
    let user = null;

    if (data.role === "owner") {
      user = await ownerModel
        .findOne({ email: data.email })
        .select("-password");
    } else {
      user = await userModel.findOne({ email: data.email }).select("-password");
    }

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }

    req.user = user;
    req.role = data.role;
    next();
  } catch (err) {
    console.log("JWT Error:", err.message);
    req.flash("error", "Session expired or invalid token");
    return res.redirect("/");
  }
};

module.exports.isOwner = async function (req, res, next) {
  if (!req.cookies.token || req.cookies.token === "undefined") {
    req.flash("error", "Owner login required");
    return res.redirect(req.get("referer") || "/");
  }

  try {
    const data = jwt.verify(req.cookies.token, process.env.JWT_KEY);

    if (data.role !== "owner") {
      req.flash("error", "Access denied");
      return res.redirect(req.get("referer") || "/");
    }

    const owner = await ownerModel
      .findOne({ email: data.email })
      .select("-password");

    if (!owner) {
      req.flash("error", "Owner not found");
      return res.redirect(req.get("referer") || "/");
    }

    req.user = owner;
    req.role = "owner";
    next();
  } catch (err) {
    console.log("JWT Error:", err.message);
    req.flash("error", "Session expired or invalid token");
    return res.redirect(req.get("referer") || "/");
  }
};

