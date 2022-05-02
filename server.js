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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bupbu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const inventoryCollection = client.db("inventory").collection("products");   //have to change


async function run() {
    try {
        await client.connect();
        console.log('Database connected ...');

        // get inventory length api: http://localhost:5000/api/inventory/count
        app.get('/api/inventory/count', async (req, res) => {
            const result = await inventoryCollection.estimatedDocumentCount()
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
                    const newItem = { image: newImage, name, email, date, description, price, quantity, supplier }
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
            fs.unlink(`./public${image}`, (err) => {
                if (err) {
                    console.log(err)
                }
            })
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

            if(!quantity){
                return res.status(501).send({message: "Not Implemented"})
            }
            const filter = { _id: ObjectId(id) }
            const result = await inventoryCollection.updateOne(filter, { $set: { quantity } }, { upsert: true })
            if (result) {
                return res.status(200).send(result)
            } else {
                return res.status(500).send({ message: 'Internal Server Error' })
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