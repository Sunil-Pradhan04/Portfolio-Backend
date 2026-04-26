const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
pc.listIndexes().then(console.log).catch(console.error);
