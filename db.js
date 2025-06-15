const mongoose = require("mongoose");
const { log, loge } = require("./utils/logger");
const Product = require("./models/Product");

const connectDB = async () => {
	testingProducts = [
		{
			name: "Bear",
			price: 19,
			description: "Harmless bear",
			imageUrl:
				"https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcS94vcuH1kxbqicN2lz6k3z80o4_xnxUAqJ42ieTPGAG-qAm6LWs0Ah5dw9B49NAatYrKyH-wRBNaqXAmPCPut5vA",
			category: "Animals",
		},
		{
			name: "Lion",
			price: 19,
			description: "Harmless lion",
			imageUrl:
				"https://cdn.britannica.com/29/150929-050-547070A1/lion-Kenya-Masai-Mara-National-Reserve.jpg",
			category: "Animals",
		},
		{
			name: "Tiger",
			price: 19,
			description: "Harmless tiger",
			imageUrl:
				"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female.jpg/1200px-Walking_tiger_female.jpg",
			category: "Animals",
		},
		{
			name: "Hippo",
			price: 19,
			description: "Harmless hippo",
			imageUrl:
				"https://upload.wikimedia.org/wikipedia/commons/f/f2/Portrait_Hippopotamus_in_the_water.jpg",
			category: "Animals",
		},
	];
	productionProducts = [
		{
			name: "Laptop",
			price: 999,
			description: "High-performance laptop",
			imageUrl:
				"https://images.unsplash.com/photo-1611186871348-b1ce696e52c9",
			category: "Electronic",
		},
		{
			name: "Phone",
			price: 499,
			description: "Latest smartphone",
			imageUrl:
				"https://images.unsplash.com/photo-1724438192720-c19a90e24a69",
			category: "Electronic",
		},
		{
			name: "Headphones",
			price: 99,
			description: "Noise-cancelling headphones",
			imageUrl:
				"https://plus.unsplash.com/premium_photo-1679513691474-73102089c117",
			category: "Electronic",
		},
		{
			name: "Tablet",
			price: 299,
			description: "10-inch touchscreen tablet",
			imageUrl:
				"https://images.unsplash.com/photo-1542751110-97427bbecf20",
			category: "Electronic",
		},
		{
			name: "Smartwatch",
			price: 199,
			description: "Fitness tracking smartwatch",
			imageUrl:
				"https://images.unsplash.com/photo-1523395243481-163f8f6155ab",
			category: "Electronic",
		},
		{
			name: "Wireless Mouse",
			price: 29,
			description: "Ergonomic wireless mouse",
			imageUrl:
				"https://images.unsplash.com/photo-1631749352438-7d576312185d",
			category: "Electronic",
		},
		{
			name: "Keyboard",
			price: 59,
			description: "Mechanical RGB keyboard",
			imageUrl:
				"https://images.unsplash.com/photo-1619683322755-4545503f1afa",
			category: "Electronic",
		},
		{
			name: "Monitor",
			price: 249,
			description: "27-inch 4K monitor",
			imageUrl:
				"https://plus.unsplash.com/premium_photo-1661329862740-f82f5299214d",
			category: "Electronic",
		},
		{
			name: "External SSD Drive",
			price: 89,
			description: "1TB portable SSD drive",
			imageUrl:
				"https://images.unsplash.com/photo-1577538926210-fc6cc624fde2",
			category: "Electronic",
		},
		{
			name: "Webcam",
			price: 79,
			description: "1080p HD webcam",
			imageUrl:
				"https://images.unsplash.com/photo-1614588876378-b2ffa4520c22",
			category: "Electronic",
		},
		{
			name: "Bluetooth Speaker",
			price: 49,
			description: "Portable Bluetooth speaker",
			imageUrl:
				"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1",
			category: "Electronic",
		},
		{
			name: "Gaming Chair",
			price: 199,
			description: "Ergonomic gaming chair",
			imageUrl:
				"https://images.unsplash.com/photo-1633545486613-feaf749f7805",
			category: "Desk Accessories",
		},
		{
			name: "Router",
			price: 129,
			description: "Wi-Fi 6 router",
			imageUrl:
				"https://images.unsplash.com/photo-1606904825846-647eb07f5be2",
			category: "Electronic",
		},
		{
			name: "Earbuds",
			price: 99,
			description: "True wireless earbuds",
			imageUrl:
				"https://images.unsplash.com/photo-1574920162043-b872873f19c8",
			category: "Electronic",
		},
		{
			name: "Laptop Stand",
			price: 39,
			description: "Adjustable laptop stand",
			imageUrl:
				"https://images.unsplash.com/photo-1593642634443-44adaa06623a",
			category: "Desk Accessories",
		},
		{
			name: "Professional Camera",
			price: 499,
			description:
				"Câmera Canon EOS Rebel T7+ EF-S 18-55 f/3.5-5.6 IS II BR",
			imageUrl:
				"https://images.unsplash.com/photo-1474376700777-eb547d9bed2f",
			category: "Photography",
		},
		{
			name: "Smart Bulb",
			price: 19,
			description: "Color-changing smart bulb",
			imageUrl:
				"https://images.unsplash.com/photo-1597837375884-66855c7a65ce",
			category: "Smart Home",
		},
		{
			name: "Power Bank",
			price: 29,
			description: "10000mAh power bank",
			imageUrl:
				"https://images.unsplash.com/photo-1632156752398-2b2cb4e6c907",
			category: "Electronic",
		},
		{
			name: "Desk Lamp",
			price: 39,
			description: "LED desk lamp with USB port",
			imageUrl:
				"https://images.unsplash.com/photo-1526040652367-ac003a0475fe",
			category: "Desk Accessories",
		},
		{
			name: "Smart Thermostat",
			price: 149,
			description: "Wi-Fi enabled smart thermostat",
			imageUrl:
				"https://images.unsplash.com/photo-1545259742-b4fd8fea67e4",
			category: "Smart Home",
		},
	];

	const env = process.env.NODE_ENV || "testing";
	try {
		await mongoose.connect(process.env.MONGO_URI);
		log(`db.js -> MongoDB connected (${env})`);

		// Seed products
		const existingProducts = await Product.countDocuments();
		if (existingProducts === 0) {
			log("db.js -> Seeding initial products...");
			let initialProducts;
			if (env === "testing") {
				initialProducts = [...testingProducts, ...productionProducts];
			} else {
				initialProducts = productionProducts;
			}
			await Product.insertMany(initialProducts);
			log("db.js -> Initial products seeded");
		}
	} catch (err) {
		loge(`db.js -> MongoDB connection error (${env}):`, err.message);
		process.exit(1);
	}
};

module.exports = connectDB;
