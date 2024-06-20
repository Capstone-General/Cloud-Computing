const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const placesRef = admin.firestore().collection('places');

router.get('/', async (req, res) => {
    const category = req.query.category;

    if (!category) {
        res.status(400).json({
            error: 'category is required',
            message: 'Places fetched fail',
            listPlaces: []
        });
        return;
    }

    try {
        const snapshot = await placesRef.where('category', '==', category).get();
        if (snapshot.empty) {
            res.status(404).json({
                error: 'No places found for this category',
                message: 'Places fetched fail',
                listPlaces: []
            });
            return;
        }
        
        let places = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            places.push({
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

        places.sort((a, b) => b.rating - a.rating);

        res.json({
            error: 'false',
            message: 'Places fetched successfully',
            [category]: places
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            message: 'Places fetched fail',
            listPlaces: []
        });
    }
});

module.exports = router;
