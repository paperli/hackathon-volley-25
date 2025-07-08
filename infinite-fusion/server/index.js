require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large image payloads

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getRandomPair = (arr) => {
  if (arr.length < 2) return arr;
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1]];
};

// DEPRECATED: /analyze (use /analyze-scan or /analyze-answer)
app.post('/analyze', async (req, res) => {
  const { image, inventory } = req.body;
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
    let prompt;
    if (Array.isArray(inventory) && inventory.length > 0) {
      prompt = `You are an object recognition assistant for a scavenger hunt game.\nGiven an image and a list of inventory objects, your task is to:\n- Identify if any object from the inventory is present in the image. If so, return the name of that object.\n- If none of the inventory objects are present, return the name of the most prominent movable object in the image.\n- Return only one object name per image.\nInventory: ${JSON.stringify(inventory)}\nRespond with a JSON object: {\"name\": <object name>, \"confidence\": <score 0-1>}`;
    } else {
      prompt = `List all MOVABLE objects you see in this image. For each object, provide a short name and a confidence score from 0 to 1. Return the result as a JSON array of objects with 'name' and 'confidence' fields. Only include objects that a person could reasonably pick up and move.`;
    }

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
      if (Array.isArray(inventory) && inventory.length > 0) {
        // Expect a single object in JSON: { name, confidence }
        const match = text.match(/\{.*\}/s);
        if (match) {
          const obj = JSON.parse(match[0]);
          if (obj && obj.name) {
            objects = [obj];
          } else {
            objects = [];
          }
        } else {
          objects = [];
        }
      } else {
        // Try to extract the JSON array from the response
        const match = text.match(/\[.*\]/s);
        if (match) {
          objects = JSON.parse(match[0]);
        } else {
          objects = [];
        }
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

// POST /analyze-scan: expects { image }
app.post('/analyze-scan', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  try {
    const prompt = `List all MOVABLE objects you see in this image. For each object, provide a short name and a confidence score from 0 to 1. Return the result as a JSON array of objects with 'name' and 'confidence' fields. Only include objects that a person could reasonably pick up and move.`;
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
    const text = response.choices[0]?.message?.content;
    let objects = [];
    try {
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
    res.json({ objects, message: 'OpenAI Vision API result (scan).' });
  } catch (err) {
    console.error('OpenAI Vision API error (scan):', err);
    res.status(500).json({ error: 'Failed to analyze image with OpenAI Vision API.' });
  }
});

// POST /analyze-answer: expects { image, inventory }
app.post('/analyze-answer', async (req, res) => {
  const { image, inventory } = req.body;
  if (!image || !Array.isArray(inventory) || inventory.length === 0) {
    return res.status(400).json({ error: 'Image and inventory are required' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  try {
    const prompt = `You are an object recognition assistant for a scavenger hunt game.\nGiven an image and a list of inventory objects, your task is to:\n- Identify if any object from the inventory is present in the image. If so, return the name of that object.\n- If none of the inventory objects are present, return the name of the most prominent movable object in the image.\n- Return only one object name per image.\nInventory: ${JSON.stringify(inventory)}\nRespond with a JSON object: {\"name\": <object name>, \"confidence\": <score 0-1>}`;
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
    const text = response.choices[0]?.message?.content;
    let objects = [];
    try {
      const match = text.match(/\{.*\}/s);
      if (match) {
        const obj = JSON.parse(match[0]);
        if (obj && obj.name) {
          objects = [obj];
        } else {
          objects = [];
        }
      } else {
        objects = [];
      }
    } catch (err) {
      console.error('Failed to parse OpenAI response (answer):', err, text);
      objects = [];
    }
    res.json({ objects, message: 'OpenAI Vision API result (answer).' });
  } catch (err) {
    console.error('OpenAI Vision API error (answer):', err);
    res.status(500).json({ error: 'Failed to analyze image with OpenAI Vision API.' });
  }
});

// POST /generate-task: expects { objects: [<string>] }
app.post('/generate-task', async (req, res) => {
  const { objects } = req.body;
  if (!objects || !Array.isArray(objects) || objects.length < 2) {
    return res.status(400).json({ error: 'At least two objects are required to generate a task.' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  // Pick two random objects
  const [obj1, obj2] = getRandomPair(objects);
  try {
    // Generate the creative task description
    const prompt = `You are a creative game designer. Given the following two real-world objects: ${obj1} and ${obj2}, write a fun and challenging forging task for a scavenger hunt game. The task should require the player to combine these two objects to create a new, imaginative object, but DO NOT reveal the solution or which objects to combine in the description. Only provide a short, engaging description of the challenge (e.g., 'Forge something that can scoop water.'). Respond ONLY with the description as a string.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 120,
    });
    const description = response.choices[0]?.message?.content?.trim();
    if (!description) {
      return res.status(500).json({ error: 'No task description generated.' });
    }

    // Generate a creative fused object name
    const namePrompt = `You are a creative game designer. Given the following two real-world objects: ${obj1} and ${obj2}, invent a fun, imaginative, and short name for the new object that would be created by combining them. Respond ONLY with the name as a string, no explanation.`;
    const nameResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: namePrompt },
      ],
      max_tokens: 20,
    });
    const fusedName = nameResponse.choices[0]?.message?.content?.trim();

    // Compose the task object
    const task = {
      id: `task-${Date.now()}`,
      description,
      requirements: [obj1, obj2],
      solved: false,
      solutionHint: `Debug: Combine '${obj1}' and '${obj2}' to solve this task.`
    };
    res.json({ task, fusedName, message: 'Task and fused object name generated by OpenAI LLM.' });
  } catch (err) {
    console.error('OpenAI LLM error (task generation):', err);
    res.status(500).json({ error: 'Failed to generate task with OpenAI LLM.' });
  }
});

// POST /generate-image: expects { objectName }
app.post('/generate-image', async (req, res) => {
  const { objectName } = req.body;
  if (!objectName) {
    return res.status(400).json({ error: 'objectName is required' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  try {
    // Use OpenAI gpt-image-1 for image generation
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `A flat vector-style digital illustration of ${objectName}, drawn in a clean, emoji-like aesthetic. The object is rendered with smooth, solid colors, no outlines, and minimal soft shading to give a slight sense of depth. It features simple shapes, subtle highlights, and no texture or realism. The illustration is centered in the frame, uses a square format, and has a transparent background, ideal for UI icons or modern digital stickers. The color palette is soft and slightly muted, similar to Apple or Twemoji icon styles.`,
      n: 1,
      size: '1024x1024',
      background: 'transparent',
    });
    let imageUrl = response.data[0]?.url;
    if (!imageUrl && response.data[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
    }
    if (!imageUrl) {
      return res.status(500).json({ error: 'No image URL returned from OpenAI.' });
    }
    res.json({ imageUrl });
  } catch (err) {
    console.error('OpenAI image generation error:', err);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// POST /generate-capability: expects { objectName }
app.post('/generate-capability', async (req, res) => {
  const { objectName } = req.body;
  if (!objectName) {
    return res.status(400).json({ error: 'objectName is required' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  const prompt = `In one short sentence, describe a fun, whimsical, or surprising capability for an invented object called "${objectName}". Do not mention the name again in the sentence. Example: "It can turn socks into sandwiches."`;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 40,
    });
    const capability = response.choices[0]?.message?.content?.trim();
    if (!capability) {
      return res.status(500).json({ error: 'No capability returned from OpenAI.' });
    }
    res.json({ capability });
  } catch (err) {
    console.error('OpenAI capability generation error:', err);
    res.status(500).json({ error: 'Failed to generate capability with OpenAI.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
}); 