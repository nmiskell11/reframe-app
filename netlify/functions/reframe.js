// netlify/functions/reframe.js
// Enhanced version with Parent relationship, analytics, and feedback support

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Relationship-specific tone adjustments (UPDATED with Parent)
const RELATIONSHIP_CONTEXTS = {
  romantic_partner: {
    tone: "intimate and vulnerable",
    formality: "casual",
    notes: "emphasize emotional connection and long-term relationship health. Use 'we' language where appropriate."
  },
  parent: {
    tone: "respectful but clear",
    formality: "moderate",
    notes: "balance honoring the parent-child relationship with adult autonomy. Acknowledge their perspective while maintaining boundaries."
  },
  family: {
    tone: "caring but clear",
    formality: "casual to moderate",
    notes: "balance family bonds with healthy boundaries. Recognize shared history while addressing current issues."
  },
  friend: {
    tone: "honest and supportive",
    formality: "casual",
    notes: "preserve friendship while addressing issues directly. Friends can handle honesty delivered with care."
  },
  manager: {
    tone: "professional and respectful",
    formality: "formal",
    notes: "maintain professionalism while being clear about needs and concerns. Focus on solutions and collaboration."
  },
  direct_report: {
    tone: "supportive and constructive",
    formality: "professional but approachable",
    notes: "balance authority with empathy and growth mindset. Create psychological safety while addressing performance."
  },
  colleague: {
    tone: "collaborative and respectful",
    formality: "professional",
    notes: "maintain working relationship while addressing concerns. Focus on team success and mutual respect."
  },
  client: {
    tone: "professional and solution-oriented",
    formality: "formal",
    notes: "prioritize customer satisfaction while setting appropriate boundaries. Be responsive and solution-focused."
  },
  neighbor: {
    tone: "friendly but firm",
    formality: "casual to moderate",
    notes: "maintain community harmony while addressing issues. Balance friendliness with clear boundaries."
  },
  child: {
    tone: "patient and teaching-oriented",
    formality: "simple and clear",
    notes: "model healthy communication and emotional regulation for learning. Explain feelings and needs age-appropriately."
  },
  general: {
    tone: "respectful and clear",
    formality: "moderate",
    notes: "standard dignity-first communication that works in most contexts."
  }
};

function buildEnhancedPrompt(message, context, relationshipType) {
  const relContext = RELATIONSHIP_CONTEXTS[relationshipType] || RELATIONSHIP_CONTEXTS.general;
  
  let prompt = `You are reFrame, an AI communication coach built on the R³ Framework: REGULATED, RESPECTFUL, REPAIRABLE.

Your mission: Transform emotionally charged messages into dignity-first communication that strengthens relationships instead of damaging them.

RELATIONSHIP CONTEXT:
- Speaking to: ${relationshipType.replace('_', ' ')}
- Appropriate tone: ${relContext.tone}
- Formality level: ${relContext.formality}
- Key consideration: ${relContext.notes}

`;

  if (context) {
    prompt += `CONVERSATION CONTEXT (what they said or the situation):
${context}

`;
  }

  prompt += `ORIGINAL MESSAGE (what the user wants to say):
${message}

R³ FRAMEWORK PRINCIPLES:
1. REGULATED - Pause before reacting. Process emotions before responding. Strong feelings are signals, not commands.
2. RESPECTFUL - Protect human dignity even in disagreement. Separate person from position. No attacking worth.
3. REPAIRABLE - Communicate in ways that leave room for reconnection. Own impact, apologize when needed, prioritize relationship over being right.

REFRAMING GUIDELINES:
- Keep the user's authentic feelings and needs
- Use "I" statements ("I feel..." not "You always...")
- Describe impact without attributing intent
- Express what you need clearly without demands
- Show vulnerability appropriately for the relationship type
- Maintain dignity for both parties
- Create openings for dialogue
- Match the ${relContext.formality} formality level
- Use a ${relContext.tone} tone

${context ? "Consider the conversation context provided when crafting your response. Address what they said directly while reframing the user's reaction constructively." : ""}

Provide ONLY the reframed message - no preamble, no explanation, no quotation marks. Write it ready to send.`;

  return prompt;
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { message, context, relationshipType = 'general', sessionId } = JSON.parse(event.body);

    if (!message || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Build enhanced prompt with context
    const systemPrompt = buildEnhancedPrompt(message, context, relationshipType);

    // Call Claude API
    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ],
    });

    const reframedMessage = response.content[0].text;
    const apiResponseTime = Date.now() - startTime;

    // Log analytics data (you can send this to Supabase from the backend too)
    console.log('Analytics:', {
      sessionId,
      relationshipType,
      hasContext: !!context,
      inputLength: message.length,
      outputLength: reframedMessage.length,
      apiResponseTime,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reframed: reframedMessage,
        relationshipType: relationshipType,
        usedContext: !!context,
        metadata: {
          apiResponseTime: apiResponseTime,
          inputLength: message.length,
          outputLength: reframedMessage.length
        }
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to reframe message',
        details: error.message,
      }),
    };
  }
};
