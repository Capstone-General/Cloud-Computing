const express = require('express');
const router = express.Router();
const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');
const admin = require('firebase-admin');
const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const placesRef = admin.firestore().collection('places');

const ratingsFileUrl = 'https://storage.googleapis.com/api-buckett/user_place_rate.csv';
const ratingsFilePath = '/tmp/user_place_rate.csv';

// Path to the TensorFlow.js model
const modelJson = path.resolve(__dirname, '../tfjs-model/model.json');

// Function to load the TensorFlow.js model
async function loadModel() {
    try {
        const model = await tf.loadGraphModel(`file://${modelJson}`);
        console.log('Model berhasil dimuat');
        return model;
    } catch (error) {
        console.error('Gagal memuat model:', error);
        throw error;
    }
}

// Function to map model prediction to valid place_ids
async function getValidPlaceIds() {
    const placesSnapshot = await placesRef.get();
    return placesSnapshot.docs.map(doc => doc.id);
}

async function getRecommendations(model, userId, validPlaceIds) {
    try {
        const userInput = tf.tensor([[parseFloat(userId), 1]], [1, 2], 'float32');
        console.log(`User input for user ${userId}:`, userInput.arraySync());

        const prediction = model.predict(userInput);
        const predictionArray = prediction.arraySync();
        console.log(`Model prediction for user ${userId}:`, predictionArray);

        // Post-process the prediction to match valid place_ids
        const recommendedPlaceIds = predictionArray[0].map(pred => {
            // Map the prediction to the nearest valid place_id
            return validPlaceIds[Math.floor(pred * validPlaceIds.length)];
        });
        return recommendedPlaceIds;
    } catch (error) {
        console.error('Error during model prediction:', error);
        throw error;
    }
}

// Function to download a file from a URL
function downloadFile(url, dest, cb) {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(cb);
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => {});
        if (cb) cb(err.message);
    });
}

router.get('/', async (req, res) => {
    const userId = req.query.user_id;

    if (!userId) {
        res.status(400).send('user_id is required');
        return;
    }

    try {
        const model = await loadModel();
        const validPlaceIds = await getValidPlaceIds();
        const top5PlaceIds = await getRecommendations(model, userId, validPlaceIds);

        console.log(`Top 5 place IDs for user ${userId}:`, top5PlaceIds);

        let top5Places = [];
        for (const placeId of top5PlaceIds) {
            const placeDoc = await placesRef.doc(placeId).get();
            if (placeDoc.exists) {
                const data = placeDoc.data();
                console.log(`Found place for ID ${placeId}:`, data);
                top5Places.push({
                    place_id: data.place_id,
                    rating: parseFloat(data.rating),
                    category: data.category,
                    place: data.place,
                    city: data.city,
                    description: data.description,
                    price: data.price,
                    phone: data.phone,
                    sites: data.sites,
                    travel1: data.travel1,
                    travel2: data.travel2,
                    travel3: data.travel3,
                    travel4: data.travel4,
                    imageUrl: data.imageUrl || ''
                });
            } else {
                console.log(`No place found for ID ${placeId}`);
            }
        }

        if (top5Places.length === 0) {
            res.status(404).send('No places found for this user');
            return;
        }

        const categories = [...new Set(top5Places.map(place => place.category))];
        let recommendedPlaces = [];
        for (const category of categories) {
            const categoryPlacesSnapshot = await placesRef.where('category', '==', category)
                                                          .orderBy('rating', 'desc')
                                                          .limit(10)
                                                          .get();
            categoryPlacesSnapshot.forEach(doc => {
                const data = doc.data();
                if (!top5Places.some(topPlace => topPlace.place_id === data.place_id)) {
                    recommendedPlaces.push({
                        place_id: data.place_id,
                        rating: parseFloat(data.rating),
                        category: data.category,
                        place: data.place,
                        city: data.city,
                        description: data.description,
                        price: data.price,
                        phone: data.phone,
                        sites: data.sites,
                        travel1: data.travel1,
                        travel2: data.travel2,
                        travel3: data.travel3,
                        travel4: data.travel4,
                        imageUrl: data.imageUrl || ''
                    });
                }
            });
        }

        console.log(`Top 5 places:`, top5Places);
        console.log(`Recommended places:`, recommendedPlaces);

        const combinedPlaces = [...top5Places, ...recommendedPlaces.slice(0, 10)];

        res.json(combinedPlaces);
    } catch (error) {
        res.status(500).send('Error processing request: ' + error.message);
    }
});

module.exports = router;
