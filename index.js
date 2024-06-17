const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');
const { Storage } = require('@google-cloud/storage');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
const port = process.env.PORT || 8080;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const placesRef = db.collection('places');

const storage = new Storage();
const dataBucketName = 'api-buckett';
const imagesBucketName = 'images_database';
const dataBucket = storage.bucket(dataBucketName);
const imagesBucket = storage.bucket(imagesBucketName);

const fileUrl = 'https://storage.googleapis.com/api-buckett/Dataset(1).csv';
const localFilePath = '/tmp/Dataset.csv';

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

async function uploadData() {
  fs.createReadStream(localFilePath)
    .pipe(csv())
    .on('data', async (row) => {
      const placeDoc = placesRef.doc(row.place_id);
      await placeDoc.set(row);

      const fileName = `${row.place_id}.jpg`;
      const file = imagesBucket.file(fileName);
      const [exists] = await file.exists();

      if (exists) {
        const publicUrl = `https://storage.googleapis.com/${imagesBucket.name}/${fileName}`;
        await placeDoc.update({ imageUrl: publicUrl });
      }
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
    });
}

downloadFile(fileUrl, localFilePath, (err) => {
  if (err) {
    console.error('Error downloading file:', err);
  } else {
    console.log('File downloaded successfully');
    uploadData();
  }
});

app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.get('/', (req, res) => {
  res.send('JAVA JOURNEY API');
});

const placesRouter = require('./routes/places');
const ratingRouter = require('./routes/rating');
const choiceRouter = require('./routes/choice');
const predictRouter = require('./routes/predict'); // Import route for prediction

app.use('/places', placesRouter);
app.use('/user', ratingRouter);
app.use('/choice', choiceRouter);
app.use('/predict', predictRouter); // Use predict route

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
