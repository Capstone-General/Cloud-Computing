const express = require('express');
const router = express.Router();
const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');

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

router.get('/', (req, res) => {
  downloadFile(ratingsFileUrl, ratingsFilePath, (err) => {
    if (err) {
      res.status(500).json({
        error: err,
        message: "Ratings fetched fail",
        listUser: []
      });
      return;
    }

    let userRatings = [];

    fs.createReadStream(ratingsFilePath)
      .pipe(csv())
      .on('data', (row) => {
        userRatings.push({
          place_id: row.place_id,
          rating: parseFloat(row.rating),
          category: row.category,
          place: row.place,
          city: row.city,
          description: row.description,
          price: row.price,
          phone: row.phone,
          sites: row.sites,
          travel1: row.travel1,
          travel2: row.travel2,
          travel3: row.travel3,
          travel4: row.travel4,
          imageUrl: row.imageUrl || ''
        });
      })
      .on('end', () => {
        res.json({
          error: "false",
          message: "Ratings fetched successfully",
          listUser: userRatings
        });
      });
  });
});

module.exports = router;
