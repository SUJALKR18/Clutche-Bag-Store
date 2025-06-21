const cookieParser = require('cookie-parser');
const express =  require('express');
const app = express();
const path = require('path');
const db = require('./config/mongoose-connection');
const ownerRoutes = require("./routes/ownerRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(express.static(path.join(__dirname , "public")))
app.use(cookieParser());


app.use("/owner" , ownerRoutes);
app.use("/user" , userRoutes);
app.use("/product" , productRoutes);

app.listen(3000);