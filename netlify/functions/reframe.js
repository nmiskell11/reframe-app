exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    const API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are a communication coach helping people express difficult emotions in healthier ways. Your job is to reframe emotionally charged messages using these principles:

1. Own the feeling - Use "I feel..." instead of "You made me..."
2. State the observation - Describe what happened objectively
3. Express the impact - Share how it affected you
4. Stay curious - Assume positive intent and ask questions
5. Preserve authenticity - Keep their voice, just healthier

Transform this message while maintaining the person's genuine feelings and needs:

"${message}"

Return ONLY the reframed message, nothing else. No preamble, no explanation, just the improved message.`
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();
    const reframedText = data.content[0].text;

    return {
      statusCode: 200,
      body: JSON.stringify({ reframed: reframedText })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
