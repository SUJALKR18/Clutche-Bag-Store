const cookieParser = require('cookie-parser');
const express =  require('express');
const app = express();
const path = require('path');
const expressSession = require('express-session');
const flash = require('connect-flash');

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
