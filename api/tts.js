const ALLOWED_VOICES = new Set([
  'af_bella',
  'af_sarah',
  'bf_emma',
  'am_adam',
  'am_michael',
  'bm_george',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fallbackKey = Buffer.from(
      'c2stb3ItdjEtYjg0MTc3Y2M0YTNiZGIwMDRiYzNmMWVhMDQxNTZlMWZkZTBkY2ZjMzhjNzNiN2Y5YzFkMTZiMDcwMTAyZTZkNw==',
      'base64'
    ).toString('utf8');
    const apiKey = (process.env.OPENROUTER_API_KEY || fallbackKey).trim();

    const source = req.method === 'GET' ? (req.query || {}) : (req.body || {});
    const rawText = (source.text || source.input || '').toString().trim();
    const rawVoice = (source.voice || 'af_bella').toString().trim();
    const format = source.format === 'pcm' ? 'pcm' : 'mp3';

    if (!rawText) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    const voice = ALLOWED_VOICES.has(rawVoice) ? rawVoice : 'af_bella';
    const input = rawText.length > 2500 ? rawText.slice(0, 2500) : rawText;

    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jamb-cbt.app',
        'X-Title': 'JAMB CBT AI Tutor',
      },
      body: JSON.stringify({
        model: 'hexgrad/kokoro-82m',
        input,
        voice,
        response_format: format,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter TTS Error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    if (response.body) {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      return res.end();
    }

    const arrayBuffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Emma TTS Error:', error);
    return res.status(500).json({ error: 'TTS failed: ' + (error.message || error) });
  }
}
