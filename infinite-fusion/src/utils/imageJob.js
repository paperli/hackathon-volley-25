export async function requestImageGeneration(objectName, backendUrl) {
  const res = await fetch(`${backendUrl}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objectName }),
  });
  const data = await res.json();
  return data.jobId;
}

export async function pollForImage(jobId, backendUrl, interval = 3000, maxAttempts = 20) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const res = await fetch(`${backendUrl}/generate-image/${jobId}`);
    const data = await res.json();
    if (data.status === 'done') return data.result.imageUrl;
    if (data.status === 'failed') throw new Error(data.error || 'Image generation failed');
    await new Promise(res => setTimeout(res, interval));
    attempts++;
  }
  throw new Error('Image generation timed out');
} 