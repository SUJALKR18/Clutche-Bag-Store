const mongoose = require('mongoose');
const dbgr = require("debug")("development:mongoose");


mongoose
.connect(`${process.env.MONGODB_URI}/Clutche`)
.then(function(){
    dbgr("Connected");
})
.catch(function(err){
    dbgr(err);
})

module.exports = mongoose.connection;

