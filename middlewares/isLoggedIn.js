const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports.isLoggedIn = async function (req, res, next) {
  if (!req.cookies.token || req.cookies.token === "undefined") {
    req.flash("error", "You need to login first");
    return res.redirect("/");
  }

  try {
    const data = jwt.verify(req.cookies.token, process.env.JWT_KEY);
    const user = await userModel
      .findOne({ email: data.email })
      .select("-password");

    req.user = user;
    next();
  } catch (err) {
    console.log("JWT Error:", err.message);
    req.flash("error", "Session expired or invalid token");
    return res.redirect("/");
  }
};
