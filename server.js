const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const port = 4000;
const app = express()
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/bookings", { 
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const personSchema = new mongoose.Schema({
    name: String,
    mobile: Number,
    date: Date,
    goods: String,
    origin: String,
    destination: String,
    amount: Number,
    lorrynumber: String,
});

const Person = mongoose.model("items",personSchema);

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Access Denied' }); // Send JSON response for consistency

    try {
        const verified = jwt.verify(token, 'secret_key');
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid Token' }); // Send JSON response here as well
    }
};


app.get('/bookinghistory', verifyToken, async (req, res) => {
    let query = {};
    if (req.query.date) {
        const date = new Date(req.query.date);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        query = { date: { $gte: startOfDay, $lte: endOfDay } };
    } else if (req.query.search) {
        const regex = new RegExp(req.query.search, 'i');
        query = { $or: [{ name: regex }] };
    }

    Person.find(query)
      .then(data => res.json(data))
      .catch(err => {
        console.error('Error on fetching data:', err);
        res.status(500).send({ message: "Error fetching booking history" });
      });
});

  


  app.post('/booking', verifyToken, bodyParser.json(), (req, res) => {
    const newPerson = new Person({
        name: req.body.name,
        mobile: req.body.mobile,
        date: req.body.date,
        goods: req.body.goods,
        origin: req.body.origin,
        destination: req.body.destination,
        amount: req.body.amount,
        lorrynumber: req.body.lorrynumber
    });

    newPerson.save()
    .then(item => {
        res.json({ message: "Item saved to database" }); // Ensure response is in JSON
    })
    .catch(err => {
        console.error(err); // Log the error to the console
        res.status(400).json({ error: "Unable to save to database" }); // Send error in JSON
    });
});

// DELETE endpoint to remove a booking entry
app.delete('/booking/:id', (req, res) => {
    Person.findByIdAndDelete(req.params.id)  // Changed from findByIdAndRemove to findByIdAndDelete
    .then(data => {
        if (!data) {
            return res.status(404).json({ message: "No record found with that ID" });
        }
        res.json({ message: "Record deleted successfully" });
    })
    .catch(err => {
        console.error('Error on delete:', err);
        res.status(500).json({ message: "Error deleting record" });
    });
});






// Athentication

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const User = mongoose.model("User", userSchema);

async function hashPassword() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('siva1318', salt);

    const result = await User.updateOne({ username: 'sstls' }, { password: hashedPassword });
}


hashPassword();

// Register or Create User Endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        // Respond to the client
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(400).send("Invalid credentials");
    }

    const token = jwt.sign({ _id: user._id }, 'secret_key');
    res.header('auth-token', token).send({ token: token }); // Ensure JSON format
});






app.listen(port, function() {
    console.log("server started")
})