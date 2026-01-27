// reFrame Netlify Function with TWO-WAY RFD™ Protection
// Detects toxic patterns in BOTH user's message AND context (what they received)

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Gottman's Four Horsemen + Extended Patterns
const TOXIC_PATTERNS = {
  CRITICISM: 'Attacking character instead of addressing behavior',
  CONTEMPT: 'Disrespect, mockery, superiority (most destructive pattern)',
  DEFENSIVENESS: 'Playing victim, making excuses, counter-attacking',
  STONEWALLING: 'Withdrawal, silent treatment, shutting down',
  GASLIGHTING: 'Denying reality, questioning sanity, invalidating perception',
  MANIPULATION: 'Guilt-tripping, emotional blackmail, conditional love',
  THREATS: 'Ultimatums, abandonment threats, controlling behavior'
};

// TWO-WAY RFD™ DETECTION
async function detectRedFlags(message, context = null) {
  const detectionPrompt = `You are RFD™ (Red Flag Detection), an AI system built on 40+ years of Gottman Institute research.

CRITICAL: Analyze BOTH the user's message AND the context (if provided) SEPARATELY.

**CONTEXT (what they received):**
${context || 'No context provided'}

**USER'S MESSAGE (what they want to send):**
${message}

**Your task:**
1. Analyze the CONTEXT for toxic patterns (gaslighting, manipulation, contempt, etc.)
2. Analyze the USER'S MESSAGE for toxic patterns
3. Return SEPARATE detections for each

**Toxic Patterns to Detect:**
- CRITICISM: Attacking character ("you're selfish") vs behavior ("you were late")
- CONTEMPT: Disrespect, mockery, eye-rolling, superiority, name-calling
- DEFENSIVENESS: "Yes, but...", making excuses, playing victim
- STONEWALLING: Refusing to engage, silent treatment, shutting down
- GASLIGHTING: "That never happened", "you're crazy", denying their reality
- MANIPULATION: Guilt trips, "if you loved me...", emotional blackmail
- THREATS: "I'm leaving", ultimatums, controlling behavior

**Return JSON:**
{
  "inboundDetection": {
    "hasRedFlags": true/false,
    "patterns": ["GASLIGHTING", "MANIPULATION"],
    "severity": "low"/"medium"/"high",
    "explanation": "Why these patterns are harmful to the USER",
    "validation": "Message validating user's perception",
    "suggestion": "How to respond to this toxic behavior"
  },
  "outboundDetection": {
    "hasRedFlags": true/false,
    "patterns": ["CRITICISM"],
    "severity": "low"/"medium"/"high",
    "explanation": "Why these patterns are harmful",
    "suggestion": "Healthier way to express the same feeling"
  }
}

**IMPORTANT:**
- If context shows gaslighting, VALIDATE the user's reality
- Inbound = patterns in what THEY said (context)
- Outbound = patterns in what USER wants to send
- Both can be true simultaneously
- Always return both objects even if one has no red flags`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: detectionPrompt
        }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent) {
      return { inboundDetection: { hasRedFlags: false }, outboundDetection: { hasRedFlags: false } };
    }

    // Parse JSON response
    const cleanedText = textContent.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const detection = JSON.parse(cleanedText);
    return detection;

  } catch (error) {
    console.error('RFD Detection Error:', error);
    return { inboundDetection: { hasRedFlags: false }, outboundDetection: { hasRedFlags: false } };
  }
}

// Enhanced reframing with context awareness
async function enhancedReframe(message, context, relationshipType, rfdResults) {
  const inboundFlags = rfdResults.inboundDetection?.hasRedFlags;
  const outboundFlags = rfdResults.outboundDetection?.hasRedFlags;

  let systemContext = '';
  
  if (inboundFlags) {
    systemContext = `CRITICAL CONTEXT: The user is responding to toxic communication patterns (${rfdResults.inboundDetection.patterns.join(', ')}). 
Your reframe should:
1. Help them set boundaries
2. Validate their perception
3. Protect their dignity
4. NOT engage with the toxicity directly
5. Model healthy communication despite what they received`;
  }

  if (outboundFlags) {
    systemContext += `\nThe user's draft contains patterns: ${rfdResults.outboundDetection.patterns.join(', ')}. Remove these while preserving their authentic feelings.`;
  }

  const prompt = `${systemContext}

Reframe this message using R³ Framework:
- REGULATED: Calm, not reactive
- RESPECTFUL: Protects dignity
- REPAIRABLE: Leaves room for connection

**Relationship:** ${relationshipType}
**Context:** ${context || 'None provided'}
**Message:** ${message}

Return ONLY the reframed message. No explanation. Keep it authentic to their voice.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(block => block.type === 'text');
  return textContent ? textContent.text.trim() : message;
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, context, relationshipType = 'general', skipRFD = false } = JSON.parse(event.body);

    if (!message || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // TWO-WAY RFD™ DETECTION (unless skipped)
    if (!skipRFD) {
      const rfdResults = await detectRedFlags(message, context);

      // Priority: Show INBOUND detection first (more critical for user safety)
      if (rfdResults.inboundDetection?.hasRedFlags) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rfdAlert: true,
            rfdResult: {
              source: 'inbound',
              detectedIn: 'context',
              hasRedFlags: true,
              severity: rfdResults.inboundDetection.severity,
              patterns: rfdResults.inboundDetection.patterns,
              explanation: rfdResults.inboundDetection.explanation,
              validation: rfdResults.inboundDetection.validation,
              suggestion: rfdResults.inboundDetection.suggestion
            }
          })
        };
      }

      // If no inbound issues, check OUTBOUND
      if (rfdResults.outboundDetection?.hasRedFlags) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rfdAlert: true,
            rfdResult: {
              source: 'outbound',
              detectedIn: 'message',
              hasRedFlags: true,
              severity: rfdResults.outboundDetection.severity,
              patterns: rfdResults.outboundDetection.patterns,
              explanation: rfdResults.outboundDetection.explanation,
              suggestion: rfdResults.outboundDetection.suggestion
            }
          })
        };
      }

      // No red flags detected, proceed with enhanced reframing
      const reframed = await enhancedReframe(message, context, relationshipType, rfdResults);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reframed,
          relationshipType,
          usedContext: !!context,
          rfdResult: null
        })
      };

    } else {
      // RFD skipped (user chose to proceed after warning)
      const rfdResults = { inboundDetection: { hasRedFlags: false }, outboundDetection: { hasRedFlags: false } };
      const reframed = await enhancedReframe(message, context, relationshipType, rfdResults);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reframed,
          relationshipType,
          usedContext: !!context,
          rfdSkipped: true
        })
      };
    }

  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
