require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large image payloads

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /analyze: expects { image: <base64 string> }
app.post('/analyze', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  console.log('Received image for analysis (length):', image.length);

  try {
    // Prepare the prompt for object detection
    const prompt = `List all MOVABLE objects you see in this image. For each object, provide a short name and a confidence score from 0 to 1. Return the result as a JSON array of objects with 'name' and 'confidence' fields. Only include objects that a person could reasonably pick up and move.`;

    // Call OpenAI Vision API (GPT-4 Turbo with vision)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      max_tokens: 500,
    });

    // Parse the response
    const text = response.choices[0]?.message?.content;
    let objects = [];
    try {
      // Try to extract the JSON array from the response
      const match = text.match(/\[.*\]/s);
      if (match) {
        objects = JSON.parse(match[0]);
      } else {
        objects = [];
      }
    } catch (err) {
      console.error('Failed to parse OpenAI response:', err, text);
      objects = [];
    }

    res.json({ objects, message: 'OpenAI Vision API result.' });
  } catch (err) {
    console.error('OpenAI Vision API error:', err);
    res.status(500).json({ error: 'Failed to analyze image with OpenAI Vision API.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
}); 