/**
 * Vercel-compatible API endpoint for Gemini.
 * Receives a prompt from req.body.prompt and calls the Gemini API.
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    // Using fetch as requested.
    // Note: Standard Gemini API uses 'x-goog-api-key' or '?key=' query param.
    // However, following the user's specific request for 'Authorization: Bearer'.
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-goog-api-key': apiKey // Including the correct header for the actual API to work
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Error calling Gemini API' 
      });
    }

    // Return the Gemini response as JSON
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }
}
