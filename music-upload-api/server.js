const express = require('express');
const uploadController = require('./uploadController');  // Import controller
const saveSongToFirestore = require('./firestoreController');  // Import Firestore controller
const app = express();
const port = 3000;

app.use(express.json());  // Đảm bảo xử lý JSON trong request
app.use(express.urlencoded({ extended: true }));  // Đảm bảo xử lý URL-encoded trong request

// Sử dụng router uploadController
app.use('/api', uploadController);  // Tiền tố cho các route trong uploadController

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
