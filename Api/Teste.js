const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.json());

const uri = 'mongodb://localhost:27017'; // Adjust the URI as needed
const client = new MongoClient(uri);
const dbName = 'dynamicAPI';

// Middleware to set the correct collection
app.use('/:entity', async (req, res, next) => {
    try {
        if (!client.isConnected) await client.connect();
        req.collection = client.db(dbName).collection(req.params.entity);
        next();
    } catch (error) {
        res.status(500).send({ error: 'Database connection error.' });
    }
});

// Create an entity
app.post('/:entity', async (req, res) => {
    try {
        const result = await req.collection.insertOne(req.body);
        res.status(201).send(result.ops[0]);
    } catch (error) {
        res.status(500).send({ error: 'Error inserting entity.' });
    }
});

// List all entities
app.get('/:entity', async (req, res) => {
    try {
        const query = req.query.query ? JSON.parse(req.query.query) : {};
        const projection = req.query.fields
            ? req.query.fields.split(',').reduce((acc, field) => {
                  acc[field.trim()] = field.startsWith('-') ? 0 : 1;
                  return acc;
              }, {})
            : {};
        const results = await req.collection.find(query, { projection }).toArray();
        res.status(200).send(results);
    } catch (error) {
        res.status(500).send({ error: 'Error fetching entities.' });
    }
});

// Get entity by ID
app.get('/:entity/:id', async (req, res) => {
    try {
        const result = await req.collection.findOne({ _id: new ObjectId(req.params.id) });
        if (!result) return res.status(404).send({ error: 'Entity not found.' });
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: 'Error fetching entity by ID.' });
    }
});

// Update entity by ID
app.put('/:entity/:id', async (req, res) => {
    try {
        const update = { $set: req.body };
        const result = await req.collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            update
        );
        if (result.matchedCount === 0) return res.status(404).send({ error: 'Entity not found.' });
        res.status(200).send({ message: 'Entity updated successfully.' });
    } catch (error) {
        res.status(500).send({ error: 'Error updating entity.' });
    }
});

// Pagination
app.get('/:entity', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = req.query.query ? JSON.parse(req.query.query) : {};
        const projection = req.query.fields
            ? req.query.fields.split(',').reduce((acc, field) => {
                  acc[field.trim()] = field.startsWith('-') ? 0 : 1;
                  return acc;
              }, {})
            : {};

        const results = await req.collection.find(query, { projection }).skip(skip).limit(limit).toArray();
        res.status(200).send(results);
    } catch (error) {
        res.status(500).send({ error: 'Error fetching paginated entities.' });
    }
});

const PORT = 3000; 
app.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`); 
});