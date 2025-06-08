// // firestoreController.js
// const admin = require('firebase-admin');

// // Tránh khởi tạo nhiều lần nếu app đã được khởi tạo
// if (!admin.apps.length) {
//   const serviceAccount = require('./musicapp-cec76-firebase-adminsdk-fbsvc-fc315e9049.json');

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     // URL này nên là dạng chuẩn: https://<PROJECT_ID>.firebaseio.com
//     databaseURL: 'https://musicapp-cec76.firebaseio.com',
//   });
// }

const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}


const firestore = admin.firestore();

// Hàm lưu bài hát vào Firestore
const saveSongToFirestore = async (name, audio) => {
  try {
    await firestore.collection('song').add({
      name: name,
      audio: audio,
      // createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(' Song saved to Firestore');
  } catch (error) {
    console.error(' Error saving song to Firestore:', error);
  }
};

// Hàm lấy tất cả bài hát từ Firestore
const getAllSongsFromFirestore = async () => {
  try {
    const snapshot = await firestore.collection('song').orderBy('createdAt', 'desc').get();
    const songs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return songs;
  } catch (error) {
    console.error(' Error fetching songs from Firestore:', error);
    throw error;
  }
};

module.exports = {
  saveSongToFirestore,
  getAllSongsFromFirestore,
};
