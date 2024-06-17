const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const modelJson = path.resolve(__dirname, '../tfjs-model/model.json');

async function loadModel() {
    try {
        const model = await tf.loadGraphModel(`file://${modelJson}`);
        console.log('Model berhasil dimuat');
        console.log(model);

        const dummyInput = tf.zeros([1, 2]);
        const prediction = model.predict(dummyInput);
        prediction.print();
    } catch (error) {
        console.error('Gagal memuat model:', error);
    }
}

loadModel();
