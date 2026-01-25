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
// RFD™ DETECTION SYSTEM
async function detectRedFlags(message, context) {
  const detectionPrompt = `You are RFD™ (Red Flag Detection), a system that identifies potentially harmful communication patterns based on the Gottman Institute's research.

Analyze the following message for these toxic patterns:

THE FOUR HORSEMEN (Gottman Institute):
1. CRITICISM - Attacking character/personality rather than specific behavior
2. CONTEMPT - The most destructive. Disrespect, mockery, sarcasm, name-calling
3. DEFENSIVENESS - Playing victim, making excuses, cross-complaining
4. STONEWALLING - Withdrawal, silent treatment, shutting down communication

ADDITIONAL TOXIC PATTERNS:
5. GASLIGHTING - Denying reality, questioning sanity, rewriting history
6. MANIPULATION - Guilt-tripping, emotional blackmail, conditional love/approval
7. THREATS & ULTIMATUMS - Abandonment threats, consequences, controlling behavior

${context ? `CONTEXT (what they said):
${context}

This context may help understand if the message is a response to harmful behavior.
` : ''}

MESSAGE TO ANALYZE:
${message}

Respond in this EXACT JSON format (no other text):
{
  "hasRedFlags": true/false,
  "severity": "none/low/medium/high",
  "patterns": [list of pattern names detected],
  "explanation": "Brief explanation of what was detected and why it's harmful (2-3 sentences max)",
  "suggestion": "One sentence suggesting a healthier approach"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: detectionPrompt }],
    });

    const resultText = response.content[0].text.trim();
    const cleanedText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedText);
    
  } catch (error) {
    console.error('RFD Detection Error:', error);
    return {
      hasRedFlags: false,
      severity: "none",
      patterns: [],
      explanation: "",
      suggestion: ""
    };
  }
}
function buildEnhancedPrompt(message, context, relationshipType, rfdResult) {
  const relContext = RELATIONSHIP_CONTEXTS[relationshipType] || RELATIONSHIP_CONTEXTS.general;
  
  let prompt = `You are reFrame, an AI communication coach built on the R³ Framework: REGULATED, RESPECTFUL, REPAIRABLE.

Your mission: Transform emotionally charged messages into dignity-first communication that strengthens relationships instead of damaging them.

RELATIONSHIP CONTEXT:
- Speaking to: ${relationshipType.replace('_', ' ')}
- Appropriate tone: ${relContext.tone}
- Formality level: ${relContext.formality}
- Key consideration: ${relContext.notes}

`;
// Include RFD context if red flags were detected
  if (rfdResult && rfdResult.hasRedFlags) {
    prompt += `⚠️ RFD™ DETECTED HARMFUL PATTERNS: ${rfdResult.patterns.join(', ')}
The user has chosen to proceed with reframing despite these patterns. Your reframe should be ESPECIALLY careful to:
- Remove all traces of the harmful patterns detected
- Model healthy communication that addresses the underlying need
- Show how to express the valid feelings WITHOUT the toxic delivery

`;
  }
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
    const { 
      message, 
      context, 
      relationshipType = 'general', 
      sessionId,
      skipRFD = false 
    } = JSON.parse(event.body);
    
    if (!message || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }
// RUN RFD™ DETECTION (unless user is re-submitting after seeing warning)
    let rfdResult = null;
    if (!skipRFD) {
      console.log('Running RFD detection...');
      rfdResult = await detectRedFlags(message, context);
      console.log('RFD Result:', JSON.stringify(rfdResult, null, 2));
      
      // If red flags detected, return warning BEFORE reframing
      if (rfdResult.hasRedFlags) {
        console.log('RFD Alert:', {
          sessionId,
          severity: rfdResult.severity,
          patterns: rfdResult.patterns,
          timestamp: new Date().toISOString()
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rfdAlert: true,
            rfdResult: rfdResult,
            message: 'Red flags detected - user must acknowledge before proceeding'
          }),
        };
      }
    }
    // Build enhanced prompt with context
   const systemPrompt = buildEnhancedPrompt(message, context, relationshipType, rfdResult);

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
        rfdResult: rfdResult,
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
