const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const GEMINI_API_KEY = "AIzaSyBcklilewKoMufw_r3zwlFgDqAzuUbujvs";
const ESP32_URL = "https://7208-39-47-1-51.ngrok-free.app/cam-hi.jpg";

app.use(express.static("public"));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer Storage
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, "captured_image.jpg");
    },
});
const upload = multer({ storage });

// Route to Capture Image
app.get("/capture", async (req, res) => {
    try {
        const response = await axios.get(ESP32_URL, { responseType: "arraybuffer" });
        fs.writeFileSync("uploads/captured_image.jpg", response.data);
        res.json({ message: "Image captured successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to capture image from ESP32" });
    }
});

// Route to Process Image
app.post("/process", async (req, res) => {
    try {
        const userPrompt = req.body.prompt;
        const fullPrompt = `Reply in Urdu: ${userPrompt}`;

        const imagePath = path.join(__dirname, "uploads/captured_image.jpg");
        if (!fs.existsSync(imagePath)) {
            return res.status(400).json({ error: "No image found. Please capture an image first." });
        }

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: fullPrompt },
                            { inline_data: { mime_type: "image/jpeg", data: fs.readFileSync(imagePath).toString("base64") } },
                        ],
                    },
                ],
            }
        );

        const aiResponse = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "Error processing image.";
        res.json({ response: aiResponse });
    } catch (error) {
        res.status(500).json({ error: "Error processing image with Gemini API." });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
