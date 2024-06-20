const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const placesRef = admin.firestore().collection('places');

router.get('/', async (req, res) => {
    try {
        const snapshot = await placesRef.get();
        if (snapshot.empty) {
            res.status(404).json({
                error: 'No places found',
                message: 'Places fetched fail'
            });
            return;
        }
        
        let placesByCategory = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const category = data.category;

            if (!placesByCategory[category]) {
                placesByCategory[category] = [];
            }

            placesByCategory[category].push({
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
        });

        // Sort places within each category by rating
        for (const category in placesByCategory) {
            placesByCategory[category].sort((a, b) => b.rating - a.rating);
        }

        res.json({
            error: 'false',
            message: 'Places fetched successfully',
            ...placesByCategory
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            message: 'Places fetched fail'
        });
    }
});

module.exports = router;
