const express = require("express");
const router = express.Router({ caseSensitive: true });
const { login } = require("../controllers/login");
const { register } = require("../controllers/register");


console.log("Router initialized with caseSensitive.");

router.route("/login").post(login)
router.route("/register").post(register);


module.exports = router;