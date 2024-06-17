const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const placesRef = admin.firestore().collection('places');

function sortPlaces(places) {
  return places.sort((a, b) => {
    if (b.rating === a.rating) {
      return a.place.localeCompare(b.place);
    }
    return b.rating - a.rating;
  });
}

router.get('/', async (req, res) => {
  try {
    const snapshot = await placesRef.get();
    if (snapshot.empty) {
      res.status(404).json({
        error: "No places found",
        message: "Places fetched fail",
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

    const sortedPlaces = sortPlaces(places);

    res.json({
      error: "false",
      message: "Places fetched successfully",
      listPlaces: sortedPlaces
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Places fetched fail",
      listPlaces: []
    });
  }
});

module.exports = router;
