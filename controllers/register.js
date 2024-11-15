const { User } = require("../schema/members")
const bcrypt = require('bcryptjs');

module.exports.register = async (req, res) => {

    try {

        const user = await User.findOne({ email: req.body.email });

        if (user) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const hashed = await bcrypt.hash(req.body.password, 10);
        const newuser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashed
        })

        await newuser.save()
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error("Error during registration:", error); // Log the error for debugging

        return res.status(500).json({ error: "Interal Server Error "})
    };
}

