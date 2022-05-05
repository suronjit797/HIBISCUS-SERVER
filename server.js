const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fileupload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express()
const port = process.env.PORT || 5000

// middle ware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))
app.use(fileupload())

const admin = [
    'suronjit797@gmail.com',
    'mesuronjit@gmail.com'
]


const jwtVerify = async (req, res, next) => {
    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeaders.split(' ')[1]
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bupbu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const inventoryCollection = client.db("inventory").collection("products");
const blogCollection = client.db("inventory").collection("blog");

async function run() {
    try {
        await client.connect();
        console.log('Database connected ...');

        /* ---------------------------------
        -------------- jwt api -------------
        -----------------------------------*/

        // jwt token with login
        app.post('/api/user/login', async (req, res) => {
            const email = req.body.email
            const filter = admin.find(e => e === email)
            const role = filter ? 'admin' : 'user'       //role have to fetch form data base

            if (email) {
                const user = { email, role }
                const token = jwt.sign(user, process.env.TOKEN_SECRET, {
                    expiresIn: "2d"
                })
                res.status(200).send({ token })
            }
        })


        app.get('/api/user/jwt-verify', jwtVerify, (req, res) => {
            res.send(req.decoded)
        })

        /* ---------------------------------
        ---------- inventory api -----------
        -----------------------------------*/

        // get inventory length api: http://localhost:5000/api/inventory/count
        app.get('/api/inventory/count', async (req, res) => {
            const result = await inventoryCollection.estimatedDocumentCount()
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })

        // Out of stock less than 0
        app.get('/api/stock-out', async (req, res) => {
            const filter = { quantity: { $lt: 1 } }
            const result = await inventoryCollection.countDocuments(filter)
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })
        // low quantity less than 20
        app.get('/api/low-quantity', async (req, res) => {
            const filter = { quantity: { $lt: 20 } }
            const result = await inventoryCollection.countDocuments(filter)
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })
        // high quantity more than 100
        app.get('/api/high-quantity', async (req, res) => {
            const filter = { quantity: { $gt: 100 } }
            const result = await inventoryCollection.countDocuments(filter)
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })
        // suppliers
        app.get('/api/suppliers', async (req, res) => {
            const filter = {}
            const cursor = inventoryCollection.find(filter)
            const items = cursor
            
            const result = []
            await items.forEach(item => {
                if (result.indexOf(item.supplier) === -1) {
                    return result.push(item.supplier)
                }
            })
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })
        // recent products
        app.get('/api/recent', async (req, res) => {
            const filter = {}
            const cursor = inventoryCollection.find(filter).sort({_id: -1}).limit(4)
            const result = await cursor.toArray()
                        
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })





        // get my items length api: http://localhost:5000/api/inventory/count
        app.get('/api/my-item/count', jwtVerify, async (req, res) => {
            const email = req.decoded.email
            const result = await inventoryCollection.countDocuments({ email })
            if (result) {
                return res.status(200).send({ result })
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })

        // get inventory api: http://localhost:5000/api/inventory
        app.get('/api/inventory', async (req, res) => {
            const limits = parseInt(req.query.limits) || 100
            const skip = parseInt(req.query.skip) || 0
            if (limits > 100 || skip < 0) {
                return res.status(502).send({ message: 'Bad Gateway' })
            }
            const query = {}
            const cursor = inventoryCollection.find(query)
            const result = await cursor.limit(limits).skip(skip).toArray()
            if (result) {
                return res.status(200).send(result)
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })

        // get single inventory item api: http://localhost:5000/api/inventory/:id
        app.get('/api/inventory/:id', async (req, res) => {
            const { id } = req.params
            const query = { _id: ObjectId(id) }
            const result = await inventoryCollection.findOne(query)
            if (result) {
                return res.status(200).send(result)
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })

        // inventory post api: http://localhost:5000/api/inventory
        app.post('/api/inventory', async (req, res) => {
            const { name, email, date, description, price, quantity, supplier } = req.body
            // images
            const { image } = req.files
            const uniqueSuffix = Date.now() + '-' + image.name
            image.name = uniqueSuffix
            // move images in a folder
            image.mv('public/images/' + uniqueSuffix, async (error) => {
                if (error) {
                    console.log(error);
                    res.status(501).send({ message: 'server error occurred' })
                } else {
                    const newImage = `/images/${image.name}`
                    const newItem = {
                        image: newImage,
                        name,
                        email,
                        date,
                        description,
                        price: parseInt(price),
                        quantity: parseInt(quantity),
                        supplier
                    }
                    const result = await inventoryCollection.insertOne(newItem)
                    res.status(200).send(result)
                }
            })
        })

        // delete an  inventory item api: http://localhost:5000/api/inventory/:id
        app.delete('/api/inventory/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const image = req.body.image
            if (image) {
                fs.unlink(`./public${image}`, (err) => {
                    if (err) {
                        console.log(err)
                    }
                })
            }
            const result = await inventoryCollection.deleteOne(filter)
            if (result) {
                return res.status(200).send(result)
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })


        // update an  inventory item api: http://localhost:5000/api/inventory/:id
        app.put('/api/inventory/:id', async (req, res) => {
            const { id } = req.params
            const { quantity } = req.body

            if (quantity < 0) {
                return res.status(501).send({ message: "Not Implemented" })
            }
            const filter = { _id: ObjectId(id) }
            const result = await inventoryCollection.updateOne(filter, { $set: { quantity } }, { upsert: true })
            if (result) {
                return res.status(200).send(result)
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })

        // const my items
        app.get('/api/my-items', jwtVerify, async (req, res) => {
            const email = req.decoded.email

            if (email) {
                const limits = parseInt(req.query.limits) || 100
                const skip = parseInt(req.query.skip) || 0
                const query = { email }
                const cursor = inventoryCollection.find(query)
                const result = await cursor.limit(limits).skip(skip).toArray()
                if (result) {
                    return res.status(200).send(result)
                } else {
                    return res.status(500).send({ message: 'Internal Server Error' })
                }
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
            }
        })

        /* ---------------------------------
        -------------- blog api ------------
        -----------------------------------*/

        // get all blog
        app.get('/api/blog', async (req, res) => {
            const filter = {}
            const cursor = blogCollection.find(filter)
            const result = await cursor.toArray()
            res.status(200).send(result)
        })


        // post a blog
        app.post('/api/blog', async (req, res) => {
            const { post } = req.body
            if (post.question && post.answer) {
                const result = await blogCollection.insertOne(post)
                return res.status(200).send(result)
            }
            return res.status(400).send({ message: 'Bad Request' })
        })

        // remove a blog
        app.delete('/api/blog/:id', async (req, res) => {
            const { id } = req.params
            if (id) {
                const filter = { _id: ObjectId(id) }
                const result = await blogCollection.deleteOne(filter)
                res.status(200).send(result)
            }
        })















    }
    finally {

    }
}

run().catch(console.dir)



// base api
app.get('/', (req, res) => {
    res.json({ message: 'Assignment 11 server side' })
})

// listening...
app.listen(port, () => {
    console.log(`Server is online on port ${port} ...`);
})