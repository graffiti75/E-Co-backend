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
	// log(`server.js -> authMiddleware -> next: ${next}`);
	log(`server.js -> authMiddleware`);
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
app.get("/api/test", (req, res) => {
	log("Test endpoint hit");
	res.send("Test OK");
});

app.get("/api/banana", (req, res) => {
	res.send("My favourite fruit is banana!");
});

// Register Route
app.post("/api/register", async (req, res) => {
	log("server.js -> POST /api/register -> Register request:", req.body);
	const { username, email, password } = req.body;
	log(
		`server.js -> POST /api/register -> username: ${username}, email: ${email}, password: ${password}`
	);
	if (!username || !email || !password) {
		log(
			"server.js -> POST /api/register -> Validation error: Missing fields"
		);
		return res.status(400).json({ error: "All fields are required" });
	}
	if (password.length < 6) {
		log(
			"server.js -> POST /api/register -> Validation error: Password too short"
		);
		return res
			.status(400)
			.json({ error: "Password must be at least 6 characters" });
	}
	try {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			log(
				"server.js -> POST /api/register -> Error: Email already exists",
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
		loge("server.js -> POST /api/register -> Register error:", err);
		res.status(500).json({ error: "Server error" });
	}
});

// Login Route
app.post("/api/login", async (req, res) => {
	log("server.js -> POST /api/login -> Login request:", req.body);
	const { email, password } = req.body;
	log(
		`server.js -> POST /api/login -> email: ${email}, password: ${password}`
	);
	if (!email || !password) {
		log("server.js -> POST /api/login -> Validation error: Missing fields");
		return res
			.status(400)
			.json({ error: "Email and password are required" });
	}
	try {
		const user = await User.findOne({ email });
		if (!user) {
			log("server.js -> POST /api/login -> Error: User not found", email);
			return res.status(400).json({ error: "Invalid credentials" });
		}
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			log(
				"server.js -> POST /api/login -> Error: Password mismatch",
				email
			);
			return res.status(400).json({ error: "Invalid credentials" });
		}
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});
		log(`server.js -> POST /api/login -> token: ${token}`);
		res.json({
			token,
			user: { username: user.username, email: user.email },
		});
	} catch (err) {
		loge("server.js -> POST /api/login -> Login error:", err.message);
		res.status(500).json({ error: "Server error" });
	}
});

// Product Routes
app.get("/api/products", async (req, res) => {
	log("server.js -> GET /api/products");
	try {
		const products = await Product.find();
		log(`server.js -> GET /api/products -> products: ${products}`);
		// Transform products to include id field
		const transformedProducts = products.map((product) => {
			const productObj = product.toObject();
			productObj.id = productObj._id; // Add id property based on _id
			return productObj;
		});
		log(
			`server.js -> GET /api/products -> transformedProducts: ${transformedProducts}`
		);
		res.json(transformedProducts);
	} catch (err) {
		loge("server.js -> GET /api/products -> Products error:", err.message);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/api/products", async (req, res) => {
	log("server.js -> POST /api/products");
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
			"server.js -> POST /api/products -> Product create error:",
			err.message
		);
		res.status(500).json({ error: "Server error" });
	}
});

// Cart Routes
app.get("/api/cart", authMiddleware, async (req, res) => {
	try {
		log("server.js -> GET /api/cart -> Fetching cart items");
		const cartItems = await CartItem.find({ userId: req.userId })
			.populate("product")
			.exec();
		log(`server.js -> GET /api/cart -> Found ${cartItems.length} items`);

		// Clean up invalid cart items
		const validItems = [];
		for (const item of cartItems) {
			if (!item.product || typeof item.product !== "object") {
				log(
					`server.js -> GET /api/cart -> Removing invalid cart item: ${item._id}`
				);
				await CartItem.deleteOne({ _id: item._id });
				continue;
			} else {
				log(
					`server.js -> GET /api/cart -> Showing valid cart item: ${JSON.stringify(
						item,
						null,
						2
					)}`
				);
			}
			validItems.push(item);
		}
		log(
			`server.js -> GET /api/cart -> Found ${validItems.length} valid items`
		);
		res.json(validItems);
	} catch (err) {
		log(
			`server.js -> GET /api/cart -> Error fetching cart: ${err.message}`
		);
		res.status(500).json({ error: "Failed to fetch cart" });
	}
});

app.post("/api/cart", authMiddleware, async (req, res) => {
	log(`server.js -> POST /api/cart -> Request body: ${req.body}`);
	try {
		const product = req.body.product;
		const quantity = req.body.quantity || 1;

		if (!product) {
			return res.status(400).json({ error: "Product is required" });
		}

		// Check for existing cart item
		const existingCartItem = await CartItem.findOne({
			userId: req.userId,
			product: product,
		});
		if (existingCartItem) {
			// Update quantity if item exists
			existingCartItem.quantity += quantity;
			await existingCartItem.save();
			const populatedItem = await CartItem.findById(existingCartItem._id)
				.populate("product")
				.exec();
			return res.status(200).json(populatedItem);
		}

		const newCartItem = new CartItem({
			userId: req.userId,
			product: product, // CHANGE back to product
			quantity,
		});

		await newCartItem.save();

		// Populate the product details before returning
		const populatedItem = await CartItem.findById(newCartItem._id)
			.populate("product")
			.exec();

		res.status(201).json(populatedItem);
	} catch (err) {
		loge(
			"server.js -> POST /api/cart -> Failed to add to cart: ",
			err.message
		);
		res.status(500).json({ error: "Failed to add to cart" });
	}
});

app.delete("/api/cart", authMiddleware, async (req, res) => {
	console.log(
		`server.js -> DELETE /api/cart -> Clearing cart for user ${req.userId}`
	);
	try {
		await CartItem.deleteMany({ userId: req.userId });
		console.log(
			`server.js -> DELETE /api/cart -> Cart cleared for user ${req.userId}`
		);
		res.json({ message: "Cart cleared" });
	} catch (err) {
		const errorMessage = err.message || "Unknown error";
		console.error(
			`server.js -> DELETE /api/cart -> Cart clear error: ${errorMessage}`
		);
		res.status(500).json({ error: "Server error" });
	}
});

app.delete("/api/cart/:id", authMiddleware, async (req, res) => {
	log(`server.js -> DELETE /api/cart/:${req.params.id}`);
	try {
		const cartItem = await CartItem.findOneAndDelete({
			_id: req.params.id,
			userId: req.userId,
		});

		if (!cartItem) {
			return res.status(404).json({ error: "Cart item not found" });
		} else {
			log(
				`server.js -> DELETE /api/cart/:${
					req.params.id
				} -> CartItem ${JSON.stringify(cartItem, null, 2)} deleted!`
			);
		}
		res.json({ success: true });
	} catch (err) {
		log(`server.js -> DELETE /api/cart/:${req.params.id} -> 
			Failed to remove from cart: ${err.message}`);
		res.status(500).json({ error: "Failed to remove from cart" });
	}
});

app.put("/api/cart/:id", authMiddleware, async (req, res) => {
	const headers = `headers: ${JSON.stringify(req.headers)}`;
	log(
		`server.js -> PUT /api/cart/:${
			req.params.id
		} -> params: ${JSON.stringify(req.params)}, body: ${JSON.stringify(
			req.body
		)}, userId: ${req.userId}`
	);
	try {
		const { quantity } = req.body;
		const cartItem = await CartItem.findOneAndUpdate(
			{ _id: req.params.id, userId: req.userId },
			{ quantity },
			{ new: true }
		).populate("product");

		if (!cartItem) {
			return res.status(404).json({ error: "Cart item not found" });
		}
		res.json(cartItem);
	} catch (err) {
		log(`Failed to update cart: ${err.message}`);
		res.status(500).json({ error: "Failed to update cart" });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log(`Server on port ${PORT}`));
