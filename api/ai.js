export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const message =
      req.body?.message ||
      req.body?.prompt ||
      req.body?.text ||
      req.body?.userMessage ||
      '';

    if (!message.trim()) {
      return res.status(400).json({
        error: 'Message kosong'
      });
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'Kamu adalah AI assistant marketplace yang ramah dan membantu.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Groq API error'
      });
    }

    return res.status(200).json({
      reply:
        data?.choices?.[0]?.message?.content ||
        'AI tidak memberikan jawaban'
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Internal Server Error'
    });
  }
}
