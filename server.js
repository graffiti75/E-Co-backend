const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const dotenv = require("dotenv");
const { log, loge } = require("./utils/logger");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI).then(async () => {
	log("server.js -> MongoDB connected");
	// Seed products
	const Product = require("./models/Product");
	const existingProducts = await Product.countDocuments();
	if (existingProducts === 0) {
		log("server.js -> Seeding initial products...");
		const initialProducts = [
			{
				name: "Laptop",
				price: 999,
				description: "High-performance laptop",
				imageUrl:
					"https://images.unsplash.com/photo-1611186871348-b1ce696e52c9",
			},
			{
				name: "Phone",
				price: 499,
				description: "Latest smartphone",
				imageUrl:
					"https://images.unsplash.com/photo-1724438192720-c19a90e24a69",
			},
			{
				name: "Headphones",
				price: 99,
				description: "Noise-cancelling headphones",
				imageUrl:
					"https://plus.unsplash.com/premium_photo-1679513691474-73102089c117",
			},
		];
		await Product.insertMany(initialProducts);
		log("server.js -> Initial products seeded");
	}
});

// Models
const User = require("./models/User");
const Product = require("./models/Product");
const CartItem = require("./models/CartItem");

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
	log("server.js -> authMiddleware");
	const token = req.header("Authorization")?.replace("Bearer ", "");
	if (!token) {
		log("server.js -> authMiddleware -> No token provided");
		return res.status(401).json({ error: "No token provided" });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		log(
			`server.js -> authMiddleware -> Token valid, userId: ${decoded.userId}`
		);
		req.userId = decoded.userId;
		next();
	} catch (err) {
		log(`server.js -> authMiddleware -> Invalid token: ${err.message}`);
		res.status(401).json({ error: "Invalid token" });
	}
};

// Simple Test Route
app.get("/test", (req, res) => {
	log("Test endpoint hit");
	res.send("Test OK");
});

// Register Route
app.post("/api/register", async (req, res) => {
	log("server.js -> post(/api/register) -> Register request:", req.body);
	const { username, email, password } = req.body;
	log(
		`server.js -> post(/api/register) -> username: ${username}, email: ${email}, password: ${password}`
	);
	if (!username || !email || !password) {
		log(
			"server.js -> post(/api/register) -> Validation error: Missing fields"
		);
		return res.status(400).json({ error: "All fields are required" });
	}
	if (password.length < 6) {
		log(
			"server.js -> post(/api/register) -> Validation error: Password too short"
		);
		return res
			.status(400)
			.json({ error: "Password must be at least 6 characters" });
	}
	try {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			log(
				"server.js -> post(/api/register) -> Error: Email already exists",
				email
			);
			return res.status(400).json({ error: "Email already exists" });
		}
		const hashedPassword = await bcrypt.hash(password, 10);
		const user = new User({ username, email, password: hashedPassword });
		await user.save();
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});
		res.status(201).json({ token, user: { username, email } });
	} catch (err) {
		loge("server.js -> post(/api/register) -> Register error:", err);
		res.status(500).json({ error: "Server error" });
	}
});

// Login Route
app.post("/api/login", async (req, res) => {
	log("server.js -> post(/api/login) -> Login request:", req.body);
	const { email, password } = req.body;
	log(
		`server.js -> post(/api/login) -> email: ${email}, password: ${password}`
	);
	if (!email || !password) {
		log(
			"server.js -> post(/api/login) -> Validation error: Missing fields"
		);
		return res
			.status(400)
			.json({ error: "Email and password are required" });
	}
	try {
		const user = await User.findOne({ email });
		if (!user) {
			log(
				"server.js -> post(/api/login) -> Error: User not found",
				email
			);
			return res.status(400).json({ error: "Invalid credentials" });
		}
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			log(
				"server.js -> post(/api/login) -> Error: Password mismatch",
				email
			);
			return res.status(400).json({ error: "Invalid credentials" });
		}
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});
		log(`server.js -> post(/api/login) -> token: ${token}`);
		res.json({
			token,
			user: { username: user.username, email: user.email },
		});
	} catch (err) {
		loge("server.js -> post(/api/login) -> Login error:", err.message);
		res.status(500).json({ error: "Server error" });
	}
});

// Product Routes
app.get("/api/products", async (req, res) => {
	log("server.js -> get(/api/products)");
	try {
		const products = await Product.find();
		log(`server.js -> get(/api/products) -> products: ${products}`);
		res.json(products);
	} catch (err) {
		loge("server.js -> get(/api/products) -> Products error:", err.message);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/api/products", async (req, res) => {
	log("server.js -> post(/api/products)");
	const { name, price, description, imageUrl } = req.body;
	log(
		`server.js -> post(/api/products) -> name: ${name}, price: ${price}, description: ${description}, imageUrl: ${imageUrl}`
	);
	if (!name || !price || !description || !imageUrl) {
		return res.status(400).json({ error: "All fields are required" });
	}
	try {
		const product = new Product({ name, price, description, imageUrl });
		await product.save();
		res.status(201).json(product);
	} catch (err) {
		loge(
			"server.js -> post(/api/products) -> Product create error:",
			err.message
		);
		res.status(500).json({ error: "Server error" });
	}
});

// Cart Routes
app.get("/api/cart", authMiddleware, async (req, res) => {
	log("server.js -> get(/api/cart)");
	try {
		const cartItems = await CartItem.find({ userId: req.userId }).populate(
			"productId"
		);
		const validCart = cartItems.filter((item) => item.productId !== null);
		res.json(validCart);
	} catch (err) {
		loge("server.js -> get(/api/cart) -> Cart fetch error:", err.message);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/api/cart", authMiddleware, async (req, res) => {
	log("server.js -> post(/api/cart)");
	const { productId, quantity } = req.body;
	log(
		`server.js -> post(/api/cart) -> productId: ${productId}, quantity: ${quantity}`
	);
	if (!productId || !quantity) {
		return res
			.status(400)
			.json({ error: "Product ID and quantity are required" });
	}
	try {
		const existingItem = await CartItem.findOne({
			userId: req.userId,
			productId,
		});
		log(`server.js -> post(/api/cart) -> existingItem: ${existingItem}`);
		if (existingItem) {
			existingItem.quantity += quantity;
			await existingItem.save();
			res.json(existingItem);
		} else {
			const cartItem = new CartItem({
				userId: req.userId,
				productId,
				quantity,
			});
			await cartItem.save();
			res.status(201).json(cartItem);
		}
	} catch (err) {
		loge("server.js -> post(/api/cart) -> Cart add error:", err.message);
		res.status(500).json({ error: "Server error" });
	}
});

app.delete("/api/cart", authMiddleware, async (req, res) => {
	console.log(
		`server.js -> delete(/api/cart) -> Clearing cart for user ${req.userId}`
	);
	try {
		await CartItem.deleteMany({ userId: req.userId });
		console.log(
			`server.js -> delete(/api/cart) -> Cart cleared for user ${req.userId}`
		);
		res.json({ message: "Cart cleared" });
	} catch (err) {
		const errorMessage = err.message || "Unknown error";
		console.error(
			`server.js -> delete(/api/cart) -> Cart clear error: ${errorMessage}`
		);
		res.status(500).json({ error: "Server error" });
	}
});

app.delete("/api/cart/:id", authMiddleware, async (req, res) => {
	log(`server.js -> delete(/api/cart/${req.params.id}) -> Starting request`);
	const { ObjectId } = mongoose.Types;
	if (!ObjectId.isValid(req.params.id)) {
		log(
			`server.js -> delete(/api/cart/${req.params.id}) -> Invalid cart item ID`
		);
		return res.status(400).json({ error: "Invalid cart item ID" });
	}
	try {
		const result = await CartItem.findOneAndDelete({
			_id: new ObjectId(req.params.id),
			userId: req.userId,
		});
		if (!result) {
			log(
				`server.js -> delete(/api/cart/${req.params.id}) -> Cart item not found`
			);
			return res.status(404).json({ error: "Cart item not found" });
		}
		log(`server.js -> delete(/api/cart/${req.params.id}) -> Item removed`);
		res.json({ message: "Item removed" });
	} catch (err) {
		const errorMessage = err.message || "Unknown error";
		loge(
			`server.js -> delete(/api/cart/${req.params.id}) -> Cart delete error: ${errorMessage}`
		);
		res.status(500).json({ error: "Server error" });
	}
});

app.put("/api/cart/:id", authMiddleware, async (req, res) => {
	log(`server.js -> put(/api/cart/)`);
	const { quantity } = req.body;
	log(`server.js -> put(/api/cart/) -> quantity: ${quantity}`);
	if (!quantity || quantity < 1) {
		return res.status(400).json({ error: "Valid quantity is required" });
	}
	try {
		const cartItem = await CartItem.findOneAndUpdate(
			{ _id: req.params.id, userId: req.userId },
			{ quantity },
			{ new: true }
		);
		log(
			`server.js -> put(/api/cart/${req.params.id}) -> cartItem: ${cartItem}`
		);
		if (!cartItem) {
			return res.status(404).json({ error: "Cart item not found" });
		}
		res.json(cartItem);
	} catch (err) {
		loge(
			"server.js -> put(/api/cart/${id}) -> Cart update error:",
			err.message
		);
		res.status(500).json({ error: "Server error" });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log(`Server on port ${PORT}`));
