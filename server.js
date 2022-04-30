const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fileupload = require('express-fileupload');
const jwt = require('jsonwebtoken');

const app = express()
const port = process.env.PORT || 5000

// middle ware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))
app.use(fileupload())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bupbu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const inventoryCollection = client.db("inventory").collection("products");   //have to change


async function run() {
    try {
        await client.connect();
        console.log('Database connected ...');

        // inventory get api: http://localhost:5000/api/inventory
        app.get('/api/inventory', async (req, res) => {
            const query = {}
            const cursor = inventoryCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        // inventory post api: http://localhost:5000/api/inventory
        app.post('/api/inventory', async (req, res) => {
            const { name, email, model, description, price, quantity, supplier } = req.body
            // images
            const { image } = req.files
            console.log(image)
            const uniqueSuffix = Date.now() + '-' + image.name
            image.name = uniqueSuffix
            // move images in a folder
            image.mv('public/images/' + uniqueSuffix, async (error) => {
                if (error) {
                    console.log(error);
                    res.status(501).send({ message: 'server error occurred' })
                } else {
                    const newImage = `/images/${image.name}`
                    const newItem = { image: newImage, name, email, model, description, price, quantity, supplier }
                    const result = await inventoryCollection.insertOne(newItem)
                    res.status(200).send(result)
                }
            })
        })

        // delete an  inventory item api: http://localhost:5000/api/inventory

        app.delete('/api/inventory/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const result = await inventoryCollection.deleteOne(filter)
            res.send(result)
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