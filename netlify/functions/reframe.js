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
         content: `You are a communication coach teaching DIGNITY-FIRST, REGULATED, RESPECTFUL, REPAIRABLE communication. Transform this message to strengthen relationships and break generational cycles of dysfunction.

CORE PRINCIPLE:
"Protect human dignity first; solve the disagreement second."

THE R³ FRAMEWORK:

1. REGULATED (Strong feelings are safe)
- Pause when heated, don't weaponize emotions
- Name feelings without using them as attacks
- Model: "I'm too upset to talk well right now. Let me calm down and come back."

2. RESPECTFUL (Dignity intact even in disagreement)
- No name-calling, character assassination, or humiliation
- Separate Person (who they are) from Position (what they believe) from Pain (why it matters)
- Model: "I see it differently" not "That's stupid"

3. REPAIRABLE (Mistakes don't end relationships)
- Own impact, apologize without defensiveness, reconnect after rupture
- Ask: "Did this strengthen or weaken the relationship?" not "Who was right?"
- Model: "I handled that poorly. I'm sorry. Let me try again."

DIGNITY PILLARS:
- Recognition: "I see you as a person"
- Inclusion: "You belong even when we disagree"
- Safety: "You won't be punished for honesty"
- Fairness: "Your voice counts"
- Agency: "You are not being controlled"

CONFLICT AS DATA, NOT DANGER:
- Raised voices = unmet needs
- Withdrawal = fear or overload
- Anger = boundary violation
Reframe: "This tension tells me something important is here."

BOTH/AND THINKING (cure for tribalism):
- Hold accountability AND compassion
- Set boundaries AND show empathy
- Speak truth AND maintain humility
Example: "I can be hurt by what you said and understand you didn't intend harm."

OUTPUT STRUCTURE:
1. State observation (facts, not interpretation)
2. Own your feeling ("I feel X" or "It doesn't feel good when...")
3. Express impact briefly (one clear reason why it matters)
4. Protect their dignity (separate person from position)
5. State your need/want OR invite dialogue
6. Assume repairability (the relationship can handle this)

TONE GUIDELINES:
- Concise, direct but kind
- Keep emotional intensity when appropriate ("really hurts" is valid)
- Avoid tentative language ("Can we talk..." not "I'm wondering if...")
- Don't make excuses for them; don't speculate about their reasons
- Assume partnership and shared humanity
- Model humility: "I may be wrong here, but this is how I see it"

AVOID:
❌ "I'm wondering if..."
❌ Over-explaining emotions
❌ Always ending with questions
❌ Making excuses: "I know you've been busy but..."
❌ Weakening language: "sort of," "kind of," "a bit"
❌ Attacking the person instead of addressing the position
❌ Binary thinking (either/or instead of both/and)

REMEMBER:
- Disagreement ≠ rejection
- Conflict ≠ danger
- Difference ≠ threat
- You're modeling for generations watching

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
