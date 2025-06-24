const { generateToken } = require("../utils/generatetoken");
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");

module.exports.registerUser = async function (req, res) {
  const { fullname, email, password , contact} = req.body;
  let existUser = await userModel.findOne({ email });
  if (existUser) {
    return res.status(500).send("User Already Exists");
  }

  try {
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        if (err) return res.send(err.message);

        const user = await userModel.create({
          fullname,
          email,
          contact,
          password: hash,
          image: req.file ? req.file.buffer : undefined,
        });

        const token = generateToken(user);
        res.cookie("token", token);
        req.flash("userCreated" ,"User Created successfully");
        return res.redirect("/");
      });
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Something went wrong");
  }
};

module.exports.loginUser = async function (req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) return res.send("Incorrect email or password");

  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      const token = generateToken(user);
      res.cookie("token", token);
      res.redirect('/shop');
    } else {
      return res.send("Incorrect email or password");
    }
  });
};
