const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT

app.use(cors());
// const allowedOrigins = [
//     "https://sportcoveclient.vercel.app",
//     "http://localhost:3000"
// ];

// app.use((req, res, next) => {
//     const origin = req.headers.origin;

//     if (allowedOrigins.includes(origin)) {
//         res.header("Access-Control-Allow-Origin", origin);
//     }

//     res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
//     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//     res.header("Access-Control-Allow-Credentials", "true");

//     // Handle preflight
//     if (req.method === "OPTIONS") {
//         return res.sendStatus(200);
//     }

//     next();
// });
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        next()
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" })
    }

}


async function run() {
    try {

        // await client.connect();

        const db = client.db('sportcove');
        const facilityCollection = db.collection("facility");
        const bookingCollection = db.collection("booking");


        app.get("/featured", async (req, res) => {
            const result = await facilityCollection.find().limit(6).toArray();
            res.json(result);
        })

        app.get('/facility', async (req, res) => {
            const { search, types } = req.query;

            let query = {};

            if (search) {
                query.facilityName = {
                    $regex: search,
                    $options: 'i'
                };
            }
            if (types) {
                const typeArray = types.split(",");
                query.facilityType = { $in: typeArray };
            }

            result = await facilityCollection.find(query).toArray();
            res.json(result);
        })

        app.post('/facility', verifyToken, async (req, res) => {
            const facilityData = req.body;
            const result = await facilityCollection.insertOne(facilityData);
            res.json(result)
        })

        app.post('/booking', verifyToken, async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.json(result);
        })

        app.get('/booking/:userId', verifyToken, async (req, res) => {
            const { userId } = req.params;
            const result = await bookingCollection.find({ userId }).toArray();
            res.json(result);
        })

        app.get('/facility/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const result = await facilityCollection.findOne({ _id: new ObjectId(id) })
            res.json(result);
        })

        app.patch("/facility/:id", verifyToken, async (req, res) => {
            const { id } = req.params
            const updatedData = req.body

            const result = await facilityCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            )
        })

        app.delete('/facility/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await facilityCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result)
        })

        app.delete('/booking/:bookingId', verifyToken, async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
            res.json(result)
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server is working fine")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})