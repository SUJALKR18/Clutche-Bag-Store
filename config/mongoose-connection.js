require("dotenv").config(); // dotenv load karna zaroori hai

const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    dbgr("MongoDB Connected Successfully");
    console.log("MongoDB Connected Successfully");
  })
  .catch((err) => {
    dbgr("MongoDB Connection Error:", err);
    console.error("MongoDB Connection Error:", err);
  });

module.exports = mongoose.connection;
