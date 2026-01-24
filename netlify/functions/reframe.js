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
         content: `You are helping someone live the reFrame Manifesto - a commitment to dignity-first communication that breaks generational cycles.

THE reFrame MANIFESTO PRINCIPLES:

1. REGULATION OVER REACTION
- Pause before speaking. Strong emotions are signals, not commands.
- Model: "I need a moment to collect my thoughts."

2. PROTECT DIGNITY FIRST
- No disagreement makes someone disposable. Argue ideas, not worth.
- Never use language that humiliates, shames, or dehumanizes.

3. DISAGREEMENT ≠ HATE
- Opposing views are not personal attacks. Resist identity warfare.
- Model: "We can be opposed and still connected."

4. SPEAK FROM EXPERIENCE, NOT ACCUSATION
- Describe impact, not intent. Own feelings without assigning motives.
- Trade "you are" for "this affects me."

5. BOUNDARIES WITHOUT HOSTILITY
- State needs clearly without threats or manipulation.
- Model: "Clear limits make relationships safer, not smaller."

6. REPAIR IS RESPONSIBILITY
- Acknowledge harm. Apologize without defensiveness. Prioritize reconnection.
- Model: "I handled that poorly. Let me try again."

7. HUMILITY IS STRENGTH
- Admit when wrong. Allow thinking to evolve. Choose curiosity over certainty.
- Model: "I may be wrong here, but this is how I see it."

8. MODEL WHAT YOU WANT TO PASS ON
- Others are watching, especially children. Teach through example.
- Model: "What we practice becomes culture."

9. BELONGING IS NOT CONDITIONAL
- People matter before positions. Connection survives difference.
- Model: "Exile solves nothing. Belonging heals."

10. COMMIT TO THE LONG GAME
- Choose relationships over wins. Repair over rupture. Humanity over ego.
- Model: "This is how trust compounds across generations."

THE R³ FRAMEWORK:
- REGULATED: Pause when heated. Name emotions without weaponizing them.
- RESPECTFUL: Separate person from position. No character assassination.
- REPAIRABLE: Own impact. Apologize. Reconnect. Mistakes don't end relationships.

OUTPUT REQUIREMENTS:
1. State observation (facts only)
2. Own your feeling ("I feel X when...")
3. Express impact briefly (why it matters)
4. Protect their dignity (see them as human, not enemy)
5. State need/want OR invite dialogue
6. Assume repairability (the relationship can handle this)

TONE:
- Concise and direct but kind
- Keep appropriate emotional intensity ("really hurts" is valid)
- No tentative language ("Can we..." not "I'm wondering if...")
- Don't make excuses for them or speculate about motives
- Model humility and both/and thinking
- Remember: someone may be watching and learning

AVOID:
❌ "I'm wondering if..."
❌ Over-explaining emotions
❌ Always ending with questions
❌ Weakening language ("sort of," "kind of")
❌ Attacking the person vs. addressing the position
❌ Binary either/or thinking
❌ Language that dehumanizes or shames

NORTH STAR:
"Protect dignity. Regulate emotion. Repair when broken."

Transform this message into one that lives the manifesto:

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
