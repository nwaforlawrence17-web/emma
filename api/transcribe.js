export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fallbackKey = Buffer.from(
      'c2stb3ItdjEtYjg0MTc3Y2M0YTNiZGIwMDRiYzNmMWVhMDQxNTZlMWZkZTBkY2ZjMzhjNzNiN2Y5YzFkMTZiMDcwMTAyZTZkNw==',
      'base64'
    ).toString('utf8');
    const apiKey = (process.env.OPENROUTER_API_KEY || fallbackKey).trim();

    const requestBody = req.body || {};
    const audioData = requestBody.input_audio?.data || requestBody.base64Audio || '';
    const audioFormat = (requestBody.input_audio?.format || requestBody.format || 'wav')
      .toString()
      .replace(/^audio\//, '')
      .toLowerCase();

    if (!audioData) {
      return res.status(400).json({ error: 'Missing audio payload' });
    }

    const payload = {
      model: requestBody.model || 'openai/whisper-large-v3-turbo',
      input_audio: {
        data: audioData,
        format: audioFormat,
      },
      ...(requestBody.language ? { language: requestBody.language } : {}),
      provider: {
        order: ['Groq', 'DeepInfra'],
        allow_fallbacks: true,
      },
    };

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jamb-cbt.app',
        'X-Title': 'JAMB CBT AI Tutor',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error('OpenRouter Transcription Error:', response.status, rawText);
      return res.status(response.status).json({ error: rawText });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {
      parsed = { text: rawText };
    }

    return res.status(200).json({
      text: (parsed.text || '').toString().trim(),
    });
  } catch (error) {
    console.error('Emma Transcribe Error:', error);
    return res.status(500).json({ error: 'Transcription failed: ' + (error.message || error) });
  }
}

