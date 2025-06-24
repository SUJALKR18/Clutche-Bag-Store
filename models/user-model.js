const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    fullname : {
        type : String,
        minLength : 3,
        trim : true,
    },
    image : Buffer,
    email : String,
    password : String ,
    cart  :[{
        type : mongoose.Schema.Types.ObjectId,
        ref : "products",
    }],
    orders : [{
        type : Object,
        default :{}
    }],
    contact  : Number,
    memberSince : {
        type : Date,
        default : Date.now
    }
});

module.exports = mongoose.model("user" , userSchema);