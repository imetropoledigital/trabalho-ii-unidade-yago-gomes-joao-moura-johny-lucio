import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(json());

const uri = "mongodb://localhost:27017"; // Adjust the URI as needed

const client = new MongoClient(uri, {
  auth: {
    username: "admin",
    password: "admin123",
  },
});

const dbName = "dynamicAPI";

// Middleware to set the correct collection
app.use("/:entity", async (req, res, next) => {
  try {
    if (!client.isConnected) await client.connect();
    req.collection = client.db(dbName).collection(req.params.entity);
    next();
  } catch (error) {
    res.status(500).send({ error: "Database connection error." });
  }
});

// Create an entity - ok
app.post("/:entity", async (req, res) => {
  try {
    const result = await req.collection.insertOne(req.body);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Delete entity by ID - ok
app.delete("/:entity/:id", async (req, res) => {
  try {
    const result = await req.collection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 0)
      return res.status(404).send({ error: "Entity not found." });
    res.status(200).send({ message: "Entity deleted successfully." });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Get entity by ID - ok
app.get("/:entity/:id", async (req, res) => {
  try {
    const result = await req.collection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!result) return res.status(404).send({ error: "Entity not found." });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Update entity by ID - ok
app.put("/:entity/:id", async (req, res) => {
  try {
    const update = { $set: req.body };
    const result = await req.collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      update
    );
    if (result.matchedCount === 0)
      return res.status(404).send({ error: "Entity not found." });
    res.status(200).send({ message: "Entity updated successfully." });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// List all entities - ok
app.get("/:entity", async (req, res) => {
  try {
    const query = req.query.query ? JSON.parse(req.query.query) : {};
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const projection = req.query.fields
      ? req.query.fields.split(",").reduce((acc, field) => {
          acc[field.trim()] = field.startsWith("-") ? 0 : 1;
          return acc;
        }, {})
      : {};
    page / limit;
    const results = await req.collection
      .find(query, { projection })
      .skip(skip)
      .limit(limit)
      .toArray();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
