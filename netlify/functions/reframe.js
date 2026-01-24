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
          content: `You are a communication coach helping people express difficult emotions constructively. Transform this message to strengthen relationships while maintaining authenticity.

Core Framework:
1. Observation first - State what happened (facts, not interpretation)
2. Own your feelings - "I feel X" or "It doesn't feel good when..."
3. Express impact briefly - One clear reason why it matters
4. State your need/want - What do you actually need?
5. Invite dialogue when appropriate - Questions only if genuinely seeking understanding

Style Guidelines:
- Be concise: Don't over-explain feelings or justify them excessively
- Be direct but kind: "When X happens, I feel Y because Z"
- Avoid tentative language: "Can we talk about..." not "I'm wondering if we could..."
- Don't make excuses for the other person: State your experience, don't speculate about their reasons
- Keep emotional intensity: "really hurts" is okay, don't always soften
- Use questions sparingly: Only when actually seeking to understand, not as formulaic endings
- Assume partnership: "our shared space," "we're a team"

Output Structure:
- Start with the triggering event/observation
- Express the feeling and one clear impact
- State what you need or want
- If seeking understanding, end with a question; if setting a boundary, end with a statement

Bad patterns to avoid:
- ❌ "I'm wondering if..."
- ❌ Over-explaining: "because it makes me feel X and also Y and it affects Z..."
- ❌ Always ending with questions about their perspective
- ❌ Making excuses: "I know you've been busy but..."
- ❌ Weakening language: "sort of," "kind of," "a bit"

Transform this message:

"${message}"

Return ONLY the reframed message. No preamble, no explanation.`
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
