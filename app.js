const cookieParser = require('cookie-parser');
const express =  require('express');
const app = express();
const path = require('path');
const expressSession = require('express-session');
const flash = require('connect-flash');
const mongooseConnection = require("./config/mongoose-connection");
const puppeteer = require("puppeteer");
const dbgr = require("debug")("development:app");

require("dotenv").config();

const ownerRoutes = require("./routes/ownerRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const indexRouter = require("./routes/index");
const db = require("./config/mongoose-connection");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(express.static(path.join(__dirname , "public")))
app.use(cookieParser());
app.use(
    expressSession({
        resave : false,
        saveUninitialized : false,
        secret : process.env.EXPRESS_SESSION_SECRET, 
    })
);
app.use(flash());
app.use("/", indexRouter);
app.use("/owners" , ownerRoutes);
app.use("/users" , userRoutes);
app.use("/products" , productRoutes);

const PORT = process.env.PORT || 3000;

dbgr("Puppeteer Chrome Path:", puppeteer.executablePath());


mongooseConnection.once("open", () => {
  console.log("MongoDB connection is open. Starting server...");
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
