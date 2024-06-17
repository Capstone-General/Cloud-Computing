const express = require('express');
const router = express.Router();
const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');
const admin = require('firebase-admin');
const placesRef = admin.firestore().collection('places');

const ratingsFileUrl = 'https://storage.googleapis.com/api-buckett/user_place_rate.csv';
const ratingsFilePath = '/tmp/user_place_rate.csv';

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
        res.status(400).json({
            error: 'user_id is required',
            message: 'Places fetched fail',
            listPlaces: []
        });
        return;
    }

    downloadFile(ratingsFileUrl, ratingsFilePath, async (err) => {
        if (err) {
            res.status(500).json({
                error: 'Error downloading ratings file: ' + err,
                message: 'Places fetched fail',
                listPlaces: []
            });
            return;
        }

        let userRatings = [];

        fs.createReadStream(ratingsFilePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.user_id === userId) {
                    userRatings.push({
                        place_id: row.place_id,
                        rating: parseFloat(row.rating)
                    });
                }
            })
            .on('end', async () => {
                if (userRatings.length === 0) {
                    res.status(404).json({
                        error: 'No places found for this user_id',
                        message: 'Places fetched fail',
                        listPlaces: []
                    });
                    return;
                }

                userRatings.sort((a, b) => b.rating - a.rating);

                const top5UserRatings = userRatings.slice(0, 5);
                const top5PlaceIds = top5UserRatings.map(rating => rating.place_id);

                let places = [];
                try {
                    for (const placeId of top5PlaceIds) {
                        const placeDoc = await placesRef.doc(placeId).get();
                        if (placeDoc.exists) {
                            const data = placeDoc.data();
                            const userRating = top5UserRatings.find(rating => rating.place_id === placeId).rating;
                            places.push({
                                place_id: data.place_id,
                                user_rating: userRating,
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
                    }

                    const categories = [...new Set(places.map(place => place.category))];

                    let recommendedPlaces = [];
                    for (const category of categories) {
                        const categoryPlacesSnapshot = await placesRef.where('category', '==', category)
                            .orderBy('rating', 'desc')
                            .get();
                        categoryPlacesSnapshot.forEach(doc => {
                            const data = doc.data();
                            if (!places.some(place => place.place_id === data.place_id)) {
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

                    recommendedPlaces.sort((a, b) => b.rating - a.rating);

                    recommendedPlaces = recommendedPlaces.slice(0, 10);

                    const combinedPlaces = [...places, ...recommendedPlaces];

                    res.json({
                        error: 'false',
                        message: 'Places fetched successfully',
                        listPlaces: combinedPlaces
                    });
                } catch (error) {
                    res.status(500).json({
                        error: error.message,
                        message: 'Places fetched fail',
                        listPlaces: []
                    });
                }
            });
    });
});

module.exports = router;
