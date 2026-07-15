export default async function handler(req, res) {
  // CORS setup so your Flutter app can talk to the proxy without being blocked
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

  try {
    const isGemini = process.env.GEMINI_API_KEY ? true : false;

    if (isGemini) {
      // Natively convert OpenAI payload to Gemini payload
      const geminiMessages = req.body.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      // Extract system prompt if present
      const systemMsg = req.body.messages.find(m => m.role === 'system');
      const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;

      // FIXED: Using gemini-2.5-flash and trimming the API key to prevent hidden spaces
      const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: geminiMessages.filter(m => m.role !== 'system')
        })
      });

      const data = await response.json();
      if (data.error) {
         return res.status(500).json({ error: data.error.message });
      }

      // Convert back to OpenAI format for Flutter
      return res.status(200).json({
        choices: [{
          message: {
            role: 'assistant',
            content: data.candidates[0].content.parts[0].text
          }
        }]
      });
    }

    // OpenRouter logic
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer \${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jamb-cbt-app.com",
        "X-Title": "JAMB CBT Tutor"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Emma Proxy Error:", error);
    return res.status(500).json({ error: "Emma's server is currently down." });
  }
}
