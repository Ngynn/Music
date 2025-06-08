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

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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
