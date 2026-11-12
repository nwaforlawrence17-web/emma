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

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY environment variable." });
    }

    const requestBody = req.body || {};
    let model = requestBody.model || "nex-agi/nex-n2.5-mini";
    if (model === "nex-agi/nex-n2-mini") {
      model = "nex-agi/nex-n2.5-mini";
    }

    const payload = {
      model: model,
      messages: requestBody.messages || [],
      stream: true,
      max_tokens: requestBody.max_tokens || 600,
      reasoning: { effort: requestBody.reasoning_effort || "none" }
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jamb-cbt.app',
        'X-Title': 'JAMB CBT AI Tutor'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    for await (const chunk of response.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error("Emma Proxy Error:", error);
    return res.status(500).json({ error: "Emma's server is currently down." });
  }
}
