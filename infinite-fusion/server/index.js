const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large image payloads

// POST /analyze: expects { image: <base64 string> }
app.post('/analyze', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  // Placeholder: In the future, call OpenAI or Gemini Vision API here
  console.log('Received image for analysis (length):', image.length);
  // Respond with a fake result for now
  res.json({
    objects: [
      { name: 'Example Object', confidence: 0.95 },
      { name: 'Another Object', confidence: 0.88 }
    ],
    message: 'This is a placeholder response. Integrate with AI API next.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
}); 