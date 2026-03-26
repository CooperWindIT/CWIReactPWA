const express = require('express');
const multer = require("multer");
const cors = require('cors');
const path = require('path');
const sharp = require("sharp");
const Tesseract = require("tesseract.js");
require('dotenv').config();
require('./Jobs/JobServices')(); // This will run both jobs
console.log('Cron Job Server Started...');
const upload = multer({ dest: "uploads/" });
 
const app = express();
const uploadRoutes = require('./routes/uploadRoutes');
const fs = require("fs");
 
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
// Route: Upload image and extract Aadhaar
app.post("/extract_aadhaar", upload.single("image"), async (req, res) => {
    const inputPath = req.file.path;
    const processedPath = `processed-${req.file.filename}.png`;
    const startTime = Date.now();
 
    try {
        // Step 1: Enhance the image
        await sharp(inputPath)
            .resize({ width: 1000 })
            .grayscale()
            .threshold(150) // convert to pure black/white
            .normalize()
            .toFile(processedPath);
 
        // Step 2: Perform OCR
        const result = await Tesseract.recognize(processedPath, "eng", {
            tessedit_char_whitelist: "0123456789",
          });
        console.log("OCR Result:", result.data.text);          
        const text = result.data.text;
 
        // Match exactly 12-digit numbers, possibly spaced, and exclude ones starting with birth year
        const aadhaarMatches = text.match(/\b\d{4} \d{4} \d{4}\b/g);
 
        let aadhaar = null;
        if (aadhaarMatches && aadhaarMatches.length > 0) {
            aadhaar = aadhaarMatches.find(num =>
                !num.startsWith("198") &&
                !num.startsWith("199") &&
                !num.startsWith("200") &&
                !num.startsWith("201")
            );
        }
 
        const endTime = Date.now();
        const timeTakenSeconds = ((endTime - startTime) / 1000).toFixed(2);
 
        if (aadhaar) {
            console.log("✅ Aadhaar Number:", aadhaar);
            console.log(`🕒 Time Taken: ${timeTakenSeconds} seconds`);
            res.json({ aadhaar, timeTaken: `${timeTakenSeconds} seconds` });
        } else {
            console.log("❌ Aadhaar number not found");
            res.status(404).json({ message: "Aadhaar number not found." });
        }
 
        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(processedPath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong." });
    } finally {
        // ✅ Cleanup files whether success or error
        try { await fs.unlink(inputPath); } catch {}
        try { await fs.unlink(processedPath); } catch {}
    }
});
 
 
// Serve uploaded images and docs as static files
app.use('/uploads/CWIImages', express.static(path.join(__dirname, 'uploads', 'CWIImages')));
app.use('/uploads/CWIDocs', express.static(path.join(__dirname, 'uploads', 'CWIDocs')));
 
// Routes
app.use('/Fileupload', uploadRoutes);
 
// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Image Upload Server running at http://localhost:${PORT}`);
});
 