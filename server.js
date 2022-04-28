const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express()
const port = process.env.PORT || 5000

// middle ware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bupbu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const collection = client.db("test").collection("devices");   //have to change


async function run() {
    try {
        await client.connect();
        console.log('Database connected ...');

        // services get api: http://localhost:5000/api/services
        app.get('/api/services', (req, res) => {
            res.json({ message: 'assignmnet 11 server is online' })
        })
        // services post api: http://localhost:5000/api/services
        app.post('/api/services', (req, res) => {
            res.json({ message: 'Assignmnet 11 server side' })
        })














    }
    finally {

    }
}

run().catch(console.dir)



// base api
app.get('/', (req, res) => {
    res.json({ message: 'Assignmnet 11 server side' })
})

// listining...
app.listen(port, () => {
    console.log(`Server is online on port ${port} ...`);
})