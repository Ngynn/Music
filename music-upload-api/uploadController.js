const express = require('express');
const multer = require('multer');
const cloudinary = require('./cloudinaryConfig');
const streamifier = require('streamifier');
const saveSongToFirestore = require('./firestoreController');

const router = express.Router();

// Sử dụng multer memoryStorage để không lưu file tạm lên ổ đĩa
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route: POST /upload
router.post('/upload', upload.single('mp3'), async (req, res) => {
    if (!req.file) {
        console.log('Không có file được upload');
        return res.status(400).send('No file uploaded');
    }

    try {
        console.log(`Bắt đầu upload file: ${req.file.originalname} lên Cloudinary...`);

        const streamUpload = (reqFile) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'video',
                        public_id: `mp3_files/${reqFile.originalname}`,
                        overwrite: true,
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(reqFile.buffer).pipe(stream);
            });
        };

        const result = await streamUpload(req.file);

        console.log(' Upload thành công!');
        console.log(` URL Cloudinary: ${result.secure_url}`);

        console.log(` Đang lưu thông tin bài hát vào Firestore...`);
        await saveSongToFirestore(req.file.originalname, result.secure_url);

        console.log(' Đã lưu thông tin bài hát vào Firestore');

        res.status(200).json({ url: result.secure_url });
    } catch (error) {
        console.error(' Upload failed:', error);
        res.status(500).send('Upload failed');
    }
});

// Route: GET /file/:filename
router.get('/file/:filename', async (req, res) => {
    const { filename } = req.params;

    try {
        console.log(` Kiểm tra file "${filename}" trên Cloudinary...`);

        const result = await cloudinary.api.resource(`mp3_files/${filename}`, {
            resource_type: 'video',
        });

        console.log(' File tồn tại trên Cloudinary');
        res.json({ exists: true, url: result.secure_url, details: result });
    } catch (error) {
        if (error.http_code === 404) {
            console.warn(` File "${filename}" không tồn tại trên Cloudinary`);
            res.status(404).json({ exists: false, message: 'File not found' });
        } else {
            console.error(' Lỗi khi kiểm tra file trên Cloudinary:', error);
            res.status(500).send('Error checking file');
        }
    }
});

module.exports = router;
