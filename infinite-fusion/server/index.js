require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const Queue = require('bull');

const app = express();
const PORT = process.env.PORT || 4000;

// Bull queue for image generation
const imageQueue = new Queue('image-generation', process.env.REDIS_URL || process.env.REDISCLOUD_URL);

// CORS configuration: allow all origins
app.use(cors());
app.options('*', cors());

app.use(express.json({ limit: '10mb' })); // Support large image payloads

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getRandomPair = (arr) => {
  if (arr.length < 2) return arr;
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1]];
};

// POST /analyze-scan: supports { image } (single) or { images: [...] } (batch)
app.post('/analyze-scan', async (req, res) => {
  const { image, images } = req.body;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  // BATCH MODE: Room scan (images array)
  if (Array.isArray(images) && images.length > 0) {
    try {
      const prompt = `
        You are an object recognition assistant for a scavenger hunt game.
        Given ${images.length} images of a room, list all MOVABLE objects you see across ALL images. For each object, provide a short name and a confidence score from 0 to 1. Return the result as a JSON array of objects with 'name' and 'confidence' fields. Only include objects that a person could reasonably pick up and move.

        When listing objects:
        - If multiple images contain the same or very similar object (e.g., "water bottle" and "plastic water bottle"), merge them into a single object and use the simplest, most general name (e.g., "water bottle").
        - Treat objects with different colors as distinct (e.g., "yellow clip" and "red clip" are different objects).
        - Ignore plural forms—convert all object names to singular (e.g., "cables" becomes "cable").
        - Merge synonyms and similar objects into a single canonical name.
        - Use the most common or generic name for each object.
        - Do not include duplicate or near-duplicate objects.
        - If the same object appears in multiple images, only list it once.
      `;
      // Build OpenAI vision message with all images
      const content = [
        { type: 'text', text: prompt },
        ...images.map(img => ({ type: 'image_url', image_url: { url: img } }))
      ];
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content },
        ],
        max_tokens: 700,
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
        console.log('[analyze-scan] Batched scan detected inventory:', objects);
      } catch (err) {
        console.error('Failed to parse OpenAI response (batched scan):', err, text);
        objects = [];
      }
      return res.json({ objects, message: 'OpenAI Vision API result (batched scan).' });
    } catch (err) {
      console.error('OpenAI Vision API error (batched scan):', err);
      return res.status(500).json({ error: 'Failed to analyze images with OpenAI Vision API.' });
    }
  }
  // SINGLE IMAGE: legacy scan
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  try {
    const prompt = `
      List all MOVABLE objects you see in this image. For each object, provide a short name and a confidence score from 0 to 1. Return the result as a JSON array of objects with 'name' and 'confidence' fields. Only include objects that a person could reasonably pick up and move.

      When listing objects:
      - If multiple objects are the same or very similar (e.g., "water bottle" and "plastic water bottle"), merge them into a single object and use the simplest, most general name (e.g., "water bottle").
      - Treat objects with different colors as distinct (e.g., "yellow clip" and "red clip" are different objects).
      - Ignore plural forms—convert all object names to singular (e.g., "cables" becomes "cable").
      - Merge synonyms and similar objects into a single canonical name.
      - Use the most common or generic name for each object.
      - Do not include duplicate or near-duplicate objects.
    `;
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
      // Debug log: print the detected inventory list (objects)
      console.log('[analyze-scan] Detected inventory:', objects);
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
  // Add job to queue
  const job = await imageQueue.add({ objectName });
  res.json({ jobId: job.id });
});

// GET /generate-image/:jobId - poll for job status/result
app.get('/generate-image/:jobId', async (req, res) => {
  const job = await imageQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.finishedOn) {
    res.json({ status: 'done', result: job.returnvalue });
  } else if (job.failedReason) {
    res.json({ status: 'failed', error: job.failedReason });
  } else {
    res.json({ status: 'pending' });
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

// POST /generate-fusion-meta: expects { baseNames: [a, b] }
app.post('/generate-fusion-meta', async (req, res) => {
  const { baseNames } = req.body;
  if (!baseNames || !Array.isArray(baseNames) || baseNames.length !== 2) {
    return res.status(400).json({ error: 'baseNames (array of two strings) is required' });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }
  try {
    const prompt = `You are a creative game designer. Given the following two real-world objects: "${baseNames[0]}" and "${baseNames[1]}", invent a fun, creative fusion name for the new object, and write a whimsical one-sentence capability for it, make sure it's short and creative. Respond in JSON with keys 'fusionName' and 'capability'.`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 120,
    });
    const text = response.choices[0]?.message?.content || '';
    let fusionName = '', capability = '';
    try {
      const json = JSON.parse(text);
      fusionName = json.fusionName;
      capability = json.capability;
    } catch {
      // fallback: try to extract from text
      const match = text.match(/"fusionName"\s*:\s*"([^"]+)"/);
      if (match) fusionName = match[1];
      const capMatch = text.match(/"capability"\s*:\s*"([^"]+)"/);
      if (capMatch) capability = capMatch[1];
    }
    if (!fusionName || !capability) {
      return res.status(500).json({ error: 'Failed to parse fusionName or capability from OpenAI response', raw: text });
    }
    res.json({ fusionName, capability });
  } catch (err) {
    console.error('OpenAI fusion meta generation error:', err);
    res.status(500).json({ error: 'Failed to generate fusion meta' });
  }
});

// Bull worker to process image generation jobs
imageQueue.process(async (job) => {
  const { objectName } = job.data;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) throw new Error('OpenAI API key not configured');

  const openai = new OpenAI({ apiKey: openaiApiKey });
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
  if (!imageUrl) throw new Error('No image URL returned from OpenAI.');
  return { imageUrl };
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
}); 