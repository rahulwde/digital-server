require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb')

const app = express()
const cors = require('cors')
const { ObjectId } = require('mongodb')

const port = process.env.PORT || 5000

app.use(express.json())
app.use(cors())

// Use environment variables properly
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.cc1e1ph.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
})

async function run() {
	try {
		const database = client.db('myShop')
		const productsCollection = database.collection('products')
		const cartCollection = database.collection('cart')
		const ordersCollection = database.collection('orders')
		const usersCollection = database.collection('users')
		const reviewsCollection = database.collection('reviews')
		const invoicesCollection = database.collection('invoices');


		// Basic route
		//user
		app.post('/users', async (req, res) => {
			try {
				const { name, email, role } = req.body
				if (!email) {
					return res.status(400).send({ message: 'Email is required' })
				}

				const existingUser = await usersCollection.findOne({ email })
				if (existingUser) {
					return res.send({
						message: 'User already exists',
						user: existingUser,
					})
				}

				const newUser = { name, email, role: role || 'user' }
				const result = await usersCollection.insertOne(newUser)
				res.send(result)
			} catch (error) {
				res.status(500).send({ error: error.message })
			}
		})
		// 🔹 Get role by email
		app.get('/users/:email', async (req, res) => {
			try {
				const email = req.params.email
				const user = await usersCollection.findOne({ email })
				if (!user) {
					return res.status(404).send({ message: 'User not found' })
				}
				res.send({ role: user.role })
			} catch (error) {
				res.status(500).send({ error: error.message })
			}
		})

		app.get('/products', async (req, res) => {
			try {
				const products = await productsCollection.find({}).toArray()
				res.json(products)
			} catch (error) {
				res
					.status(500)
					.json({ message: 'Failed to fetch products', error: error.message })
			}
		})
 


 

		// POST new product
		app.get('/products/:id', async (req, res) => {
			try {
				const { id } = req.params
				const product = await productsCollection.findOne({
					_id: new ObjectId(id),
				})
				if (!product) {
					return res.status(404).json({ message: 'Product not found' })
				}
				res.json(product)
			} catch (err) {
				res.status(500).json({ message: err.message })
			}
		})
		app.put("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedProduct = req.body;
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedProduct }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to update product" });
  }
});
	app.delete('/products/:id', async (req, res) => {
			try {
				const { id } = req.params

				if (!ObjectId.isValid(id)) {
					return res.status(400).json({ message: 'Invalid id' })
				}

				const result = await productsCollection.deleteOne({ _id: new ObjectId(id) })

				if (result.deletedCount === 0) {
					return res.status(404).json({ message: 'Item not found' })
				}

				res.json({ success: true })
			} catch (error) {
				res.status(500).json({ message: error.message })
			}
		})

		app.post("/products", async (req, res) => {
  try {
    const product = req.body;

    // Basic validation
    if (!product.itemName || !product.images || !product.sellPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await productsCollection.insertOne(product);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create product" });
  }
});
app.post('/reviews', async (req, res) => {
  try {
    const { productId, userEmail, rating, comment } = req.body;

    // Validate request
    if (!productId || !userEmail || !rating || !comment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newReview = {
      productId: new ObjectId(productId), // MongoDB ObjectId
      userEmail,
      rating: Number(rating),             // ensure numeric
      comment,
      createdAt: new Date(),
    };

    const result = await reviewsCollection.insertOne(newReview);

    // Send back the inserted review with its MongoDB _id
    res.status(201).json({ ...newReview, _id: result.insertedId });

  } catch (err) {
    console.error('Error adding review:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

		// GET reviews by productId
		app.get('/reviews/:productId', async (req, res) => {
			try {
				const { productId } = req.params
				const reviews = await reviewsCollection
					.find({ productId: new ObjectId(productId) })
					.sort({ createdAt: -1 })
					.toArray()
				res.json(reviews)
			} catch (err) {
				console.error(err)
				res.status(500).json({ message: 'Server error' })
			}
		})
		app.post('/cart', async (req, res) => {
			try {
				const { guestId, productId, quantity, itemName, sellPrice, image } =
					req.body
				if (!guestId || !productId) {
					return res
						.status(400)
						.json({ message: 'guestId and productId required' })
				}

				// Check if already in cart
				const existing = await cartCollection.findOne({ guestId, productId })
				if (existing) {
					return res.status(400).json({ message: 'Item already in cart' })
				}

				const result = await cartCollection.insertOne({
					guestId,
					productId,
					quantity,
					image,
					itemName,
					sellPrice,
					createdAt: new Date(),
				})

				res.status(201).json({ success: true, insertedId: result.insertedId })
			} catch (error) {
				res.status(500).json({ message: error.message })
			}
		})

		// ✅ Get cart items by guestId
		app.get('/cart/guest/:guestId', async (req, res) => {
			try {
				const { guestId } = req.params
				const items = await cartCollection.find({ guestId }).toArray()
				res.json(items)
			} catch (error) {
				res.status(500).json({ message: error.message })
			}
		})

		// ✅ Update quantity
		app.put('/cart/:id', async (req, res) => {
			try {
				const { id } = req.params
				const { quantity } = req.body

				if (!ObjectId.isValid(id)) {
					return res.status(400).json({ message: 'Invalid ID format' })
				}
				if (!quantity || quantity < 1) {
					return res
						.status(400)
						.json({ message: 'Quantity must be at least 1' })
				}

				const result = await cartCollection.updateOne(
					{ _id: new ObjectId(id) },
					{ $set: { quantity } },
				)

				if (result.modifiedCount === 0) {
					return res.status(404).json({ message: 'Cart item not found' })
				}

				res.json({ success: true, message: 'Quantity updated successfully' })
			} catch (err) {
				res.status(500).json({ message: err.message })
			}
		})

		// ✅ Remove item
		app.delete('/cart/:id', async (req, res) => {
			try {
				const { id } = req.params

				if (!ObjectId.isValid(id)) {
					return res.status(400).json({ message: 'Invalid id' })
				}

				const result = await cartCollection.deleteOne({ _id: new ObjectId(id) })

				if (result.deletedCount === 0) {
					return res.status(404).json({ message: 'Item not found' })
				}

				res.json({ success: true })
			} catch (error) {
				res.status(500).json({ message: error.message })
			}
		})
		//order
		// ✅ Orders Collection
		app.post('/orders', async (req, res) => {
			try {
				const {
					guestId,
					items,
					totalPrice,
					status,
					customer,
					advancePayment,
					paymentProof,
					transactionId,
				} = req.body

				// ✅ Validation
				if (
					!guestId ||
					!items ||
					items.length === 0 ||
					!customer ||
					!advancePayment
				) {
					return res.status(400).json({ message: 'Missing required fields' })
				}

				// Create order object
				const order = {
					guestId,
					items,
					totalPrice,
					status: status || 'pending',
					createdAt: new Date(),
					customer,
					advancePayment,
					paymentProof: paymentProof || '',
					transactionId: transactionId || '',
				}

				// Insert into ordersCollection
				const result = await ordersCollection.insertOne(order)

				res.status(201).json({ ...order, _id: result.insertedId })
			} catch (err) {
				console.error('Error creating order:', err)
				res.status(500).json({ message: 'Server error' })
			}
		})
		// ✅ Get all orders
		app.get('/orders/all', async (req, res) => {
			try {
				const allOrders = await ordersCollection.find({}).toArray()
				res.json(allOrders)
			} catch (err) {
				console.error('Error fetching all orders:', err)
				res.status(500).json({ message: 'Server error' })
			}
		})

		// ✅ Update order status
		app.put('/orders/:id', async (req, res) => {
			try {
				const { id } = req.params
				const { status } = req.body

				if (!['pending', 'approved', 'rejected'].includes(status)) {
					return res.status(400).json({ message: 'Invalid status' })
				}

				const result = await ordersCollection.updateOne(
					{ _id: new ObjectId(id) },
					{ $set: { status } },
				)

				if (result.matchedCount === 0)
					return res.status(404).json({ message: 'Order not found' })

				res.json({ success: true })
			} catch (err) {
				console.error('Error updating order status:', err)
				res.status(500).json({ message: 'Server error' })
			}
		})
		app.delete('/orders/:id', async (req, res) => {
			try {
				const { id } = req.params

				if (!ObjectId.isValid(id)) {
					return res.status(400).json({ message: 'Invalid id' })
				}

				const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) })

				if (result.deletedCount === 0) {
					return res.status(404).json({ message: 'Item not found' })
				}

				res.json({ success: true })
			} catch (error) {
				res.status(500).json({ message: error.message })
			}
		})

		app.get('/orders', async (req, res) => {
			try {
				const email = req.query.email
				if (!email) return res.status(400).json({ message: 'Email required' })

				const userOrders = await ordersCollection
					.find({ 'customer.email': email })
					.toArray()

				res.json(userOrders)
			} catch (err) {
				console.error('Error fetching orders:', err)
				res.status(500).json({ message: 'Server error' })
			}
		})
		app.delete('/orders/:id', async (req, res) => {
			const id = req.params.id
			const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) })
			res.send(result)
		})
	} catch (error) {
		console.error('MongoDB connection error:', error)
	}
}
// Get invoices by email
app.get('/invoices', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const invoices = await invoicesCollection.find({ customerEmail: email }).toArray();
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post("/invoices", async (req, res) => {
  try {
    const { orderId, userEmail, items, totalAmount, customer } = req.body;

    // Validate required fields
    if (!orderId || !userEmail || !items || !totalAmount || !customer) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Convert orderId to ObjectId if possible
    const orderObjectId = ObjectId.isValid(orderId)
      ? new ObjectId(orderId)
      : orderId;

    const newInvoice = {
      orderId: orderObjectId,
      userEmail,
      items,
      totalAmount,
      customer,
      createdAt: new Date(),
    };

    const result = await invoicesCollection.insertOne(newInvoice);

    res.status(201).json(newInvoice);
  } catch (err) {
    console.error("Error creating invoice:", err);
    res.status(500).json({ message: "Server error while creating invoice" });
  }
});


run().catch(console.dir)

app.get('/', (req, res) => {
	res.send('Hello from Node.js and Express backend!')
})
// Start the server after DB connection is ready
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`)
})
