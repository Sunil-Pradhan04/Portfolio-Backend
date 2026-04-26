/**
 * storage.service.js — Portfolio Vector Storage Service
 *
 * Mirrors Event_Backend/services/storage.js but adapted for:
 *  - CommonJS (require/module.exports)
 *  - Single "portfolio" namespace in Pinecone (no eventId filter)
 *  - Chunk size 30 words, overlap 10 (slightly larger for bio-style text)
 *  - topK: 2 chunks returned (as specified in requirements)
 *  - delete by prefix support (to replace all info cleanly)
 */

require('dotenv').config();
const { getPineconeIndex } = require('../db/pinecone');
const { openai } = require('../db/openai');

/* ──────────────────────────────────────────────
   EMBEDDINGS  (using OpenAI)
────────────────────────────────────────────── */
const getBatchEmbeddings = async (texts) => {
    try {
        const input = Array.isArray(texts) ? texts : [texts];
        if (input.length === 0) return [];

        const resp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input,
        });

        return resp.data.map((d) => d.embedding);
    } catch (err) {
        console.error('❌ Embedding Error:', err.message);
        return [];
    }
};

/* ──────────────────────────────────────────────
   TEXT → CHUNKS  (sliding window, word-based)
   Same algorithm as Event_Backend
────────────────────────────────────────────── */
const createChunks = (text, size = 30, overlap = 10) => {
    const words = text.trim().split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += size - overlap) {
        const chunk = words.slice(i, i + size).join(' ');
        if (chunk.trim()) chunks.push(chunk);
        if (i + size >= words.length) break;
    }

    return chunks;
};

/* ──────────────────────────────────────────────
   STORE — chunk → embed → upsert to Pinecone
   namespace: "portfolio"   section: e.g. "about", "skills", "projects"
────────────────────────────────────────────── */
const storeTextInVectorDB = async (text, section = 'general') => {
    console.log(`📥 Storing knowledge for section: "${section}" (${text.length} chars)`);
    try {
        const index = getPineconeIndex();
        const chunks = createChunks(text, 30, 10);
        console.log(`   Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            console.warn('⚠️  No chunks created — text may be too short.');
            return { success: false, message: 'Text too short to chunk.' };
        }

        const embeddings = await getBatchEmbeddings(chunks);

        if (!embeddings || embeddings.length === 0) {
            return { success: false, message: 'Failed to generate embeddings.' };
        }

        const vectors = embeddings.map((embedding, i) => ({
            id: `${section}_${Date.now()}_${i}`,
            values: embedding,
            metadata: {
                section,       // e.g. "about", "skills", "projects"
                chunkNo: i,
                text: chunks[i],
                storedAt: new Date().toISOString(),
            },
        }));

        await index.upsert({ records: vectors });

        console.log(`✅ Stored ${vectors.length} vectors for section "${section}"`);
        return { success: true, chunks: vectors.length };
    } catch (err) {
        console.error('❌ Error storing vectors:', err);
        return { success: false, message: err.message };
    }
};

/* ──────────────────────────────────────────────
   QUERY — embed query → fetch topK chunks from Pinecone
   Returns the top 2 most relevant chunks (as required)
────────────────────────────────────────────── */
const getTopChunks = async (queryText, topK = 2) => {
    try {
        const index = getPineconeIndex();

        // Embed the query (single string → array of 1)
        const embeddings = await getBatchEmbeddings([queryText]);
        if (!embeddings || embeddings.length === 0) {
            console.warn('⚠️  Could not embed query');
            return [];
        }

        const result = await index.query({
            vector: embeddings[0],
            topK,
            includeMetadata: true,
        });

        const matches = result.matches || [];
        console.log(`🔍 Query "${queryText.slice(0, 40)}..." → ${matches.length} chunks retrieved`);

        return matches; // array of { id, score, metadata: { text, section, ... } }
    } catch (err) {
        console.error('❌ Query error:', err.message);
        return [];
    }
};

/* ──────────────────────────────────────────────
   DELETE — remove all vectors for a section
   (call before re-uploading to avoid duplicates)
────────────────────────────────────────────── */
const deleteSection = async (section) => {
    console.log(`🗑️  Deleting all vectors for section: "${section}"`);
    try {
        const index = getPineconeIndex();
        // Pinecone doesn't support metadata filter deletes on free tier for some plans
        // Use deleteMany with filter if your plan supports it, else use namespace or ids
        await index.deleteMany({ filter: { section: { $eq: section } } });
        console.log(`✅ Deleted vectors for section: "${section}"`);
        return { success: true };
    } catch (err) {
        console.error('❌ Error deleting vectors:', err.message);
        return { success: false, message: err.message };
    }
};

/* ──────────────────────────────────────────────
   DELETE ALL — wipe the entire portfolio index
   (useful for full refresh)
────────────────────────────────────────────── */
const deleteAllVectors = async () => {
    console.log('🗑️  Deleting ALL portfolio vectors...');
    try {
        const index = getPineconeIndex();
        await index.deleteAll();
        console.log('✅ All vectors deleted');
        return { success: true };
    } catch (err) {
        console.error('❌ Error deleting all vectors:', err.message);
        return { success: false, message: err.message };
    }
};

module.exports = {
    storeTextInVectorDB,
    getTopChunks,
    deleteSection,
    deleteAllVectors,
    createChunks, // exported for testing
};
