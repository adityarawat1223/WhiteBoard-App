const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyparser = require("body-parser");
const  router  = require("./routes/route");
const cors = require("cors");
app.use(express.json());
mongoose.connect("mongodb+srv://burstingfire:TRLYA9VFNdLgy4pX@web-db.9rw7g.mongodb.net/?retryWrites=true&w=majority&appName=Web-Db").then(() => {
    console.log("Connected DB");
}).catch((error) => {
    console.log(error);
});
app.use(bodyparser.json());



app.use("" ,router)

app.listen(3000, () => {
    console.log("Server Is Running")
});

