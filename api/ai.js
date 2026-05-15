export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // Ambil message dari frontend
    const message =
      req.body?.message ||
      req.body?.prompt ||
      req.body?.text ||
      req.body?.userMessage ||
      '';

    // Kalau kosong
    if (!message.trim()) {
      return res.status(400).json({
        error: 'Message kosong'
      });
    }

    // Request ke Groq
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
              content:
                'Kamu adalah AI assistant marketplace yang ramah dan membantu.'
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

    // Kalau error dari Groq
    if (!response.ok) {
      console.log(data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          'Groq API error'
      });
    }

    // Ambil jawaban AI
    const reply =
      data?.choices?.[0]?.message?.content ||
      'AI tidak memberikan jawaban';

    // Kirim ke frontend
    return res.status(200).json({
      reply
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message || 'Internal Server Error'
    });
  }
}
