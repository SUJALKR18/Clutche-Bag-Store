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
    cart: [{
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "products",
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1,
            }
        }
    ],
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