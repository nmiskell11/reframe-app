// netlify/functions/reframe.js
// Updated: Two-Way RFD™ Detection with Sequential Processing

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Relationship-specific context for prompting
const RELATIONSHIP_CONTEXTS = {
  romantic_partner: {
    tone: "intimate and vulnerable",
    formality: "casual",
    approach: "Use 'I' statements, express needs clearly, invite dialogue"
  },
  parent: {
    tone: "respectful but firm",
    formality: "moderate",
    approach: "Balance respect for the relationship with your adult boundaries"
  },
  family: {
    tone: "warm but direct",
    formality: "casual to moderate",
    approach: "Preserve family bonds while addressing issues honestly"
  },
  friend: {
    tone: "honest and caring",
    formality: "casual",
    approach: "Direct communication with care for the friendship"
  },
  manager: {
    tone: "professional and solution-focused",
    formality: "formal",
    approach: "Focus on outcomes, maintain professional boundaries, be respectful"
  },
  direct_report: {
    tone: "supportive but clear",
    formality: "professional",
    approach: "Balance authority with psychological safety, focus on growth"
  },
  colleague: {
    tone: "collaborative and respectful",
    formality: "professional",
    approach: "Keep it constructive, maintain working relationship"
  },
  client: {
    tone: "professional and solution-oriented",
    formality: "formal",
    approach: "Prioritize service excellence while setting boundaries"
  },
  neighbor: {
    tone: "friendly but firm",
    formality: "moderate",
    approach: "Maintain community harmony while being clear about boundaries"
  },
  child: {
    tone: "patient and teaching-oriented",
    formality: "simple and clear",
    approach: "Model healthy communication, teach emotional regulation"
  },
  general: {
    tone: "balanced and thoughtful",
    formality: "moderate",
    approach: "Maintain dignity while expressing needs clearly"
  }
};

// RFD™ Detection Function - Analyzes a message for toxic patterns
async function detectRedFlags(message, source = 'outbound') {
  const detectionPrompt = `You are a relationship psychology expert analyzing communication patterns based on Dr. John Gottman's "Four Horsemen" research.

Analyze this message for toxic communication patterns:

"${message}"

PATTERNS TO DETECT (Gottman's Four Horsemen + Additional):
1. CRITICISM - Attacking character/personality rather than specific behavior
2. CONTEMPT - Disrespect, mockery, sarcasm, superiority, name-calling (MOST destructive)
3. DEFENSIVENESS - Playing victim, making excuses, counter-attacking, blame-shifting
4. STONEWALLING - Withdrawal, silent treatment, shutting down
5. GASLIGHTING - Denying reality, questioning sanity, rewriting history
6. MANIPULATION - Guilt-tripping, emotional blackmail, conditional love
7. THREATS - Ultimatums, abandonment threats, "or else" statements

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "hasRedFlags": true/false,
  "severity": "low"/"medium"/"high",
  "patterns": ["PATTERN1", "PATTERN2"],
  "explanation": "Brief explanation of why these patterns are harmful",
  "suggestion": "Brief suggestion for healthier approach",
  "validation": "Validation message if this is inbound (optional)"
}

If NO toxic patterns detected, return:
{"hasRedFlags": false}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: detectionPrompt }],
    });

    const textContent = response.content.find(block => block.type === 'text')?.text || '';
    
    // Clean up response - remove markdown code blocks if present
    let cleanedText = textContent.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const result = JSON.parse(cleanedText);
    
    if (result.hasRedFlags) {
      result.source = source;
      result.detectedIn = source === 'inbound' ? 'context' : 'message';
      
      // Add validation for inbound messages
      if (source === 'inbound' && !result.validation) {
        result.validation = "Your perception is valid. These patterns are real. Trust yourself.";
      }
    }
    
    return result;
  } catch (error) {
    console.error('RFD Detection Error:', error);
    return { hasRedFlags: false };
  }
}

// Main reframing function
async function reframeMessage(message, context, relationshipType, skipRFD) {
  const relationshipContext = RELATIONSHIP_CONTEXTS[relationshipType] || RELATIONSHIP_CONTEXTS.general;
  
  // Parse context to check for inbound message
  let theirMessage = '';
  let situationContext = '';
  
  if (context) {
    // Check if context has structured format
    const theirMessageMatch = context.match(/THEIR MESSAGE:\s*"?([^"]*)"?(?:\n|$)/i);
    const situationMatch = context.match(/SITUATION:\s*(.+)/is);
    
    if (theirMessageMatch) {
      theirMessage = theirMessageMatch[1].trim();
    }
    if (situationMatch) {
      situationContext = situationMatch[1].trim();
    }
    
    // If no structured format, treat entire context as situation
    if (!theirMessage && !situationContext) {
      situationContext = context;
    }
  }
  
  const reframePrompt = `You are a communication coach using the R³ Framework (REGULATED, RESPECTFUL, REPAIRABLE).

RELATIONSHIP TYPE: ${relationshipType}
TONE: ${relationshipContext.tone}
FORMALITY: ${relationshipContext.formality}
APPROACH: ${relationshipContext.approach}

${theirMessage ? `THEIR MESSAGE TO USER:\n"${theirMessage}"\n\n` : ''}
${situationContext ? `SITUATION/BACKGROUND:\n${situationContext}\n\n` : ''}

USER'S RAW MESSAGE (what they want to say):
"${message}"

TASK: Reframe the user's message using the R³ Framework:
- REGULATED: Calm, not reactive
- RESPECTFUL: Protects dignity of both parties
- REPAIRABLE: Maintains connection, leaves room for dialogue

REQUIREMENTS:
1. Keep their core feelings and needs intact
2. Remove toxic patterns (criticism, contempt, defensiveness)
3. Use tone appropriate for ${relationshipType} relationship
4. Address the actual situation/context if provided
5. Be direct and honest, not fake or overly nice
6. If their message has legitimate grievances, acknowledge them
7. Focus on specific behaviors, not character attacks

Respond with ONLY the reframed message (no preamble, no explanation).`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: reframePrompt }],
    });

    const reframed = response.content.find(block => block.type === 'text')?.text || '';
    return reframed.trim();
  } catch (error) {
    console.error('Reframe Error:', error);
    throw new Error('Failed to reframe message');
  }
}

// Main handler
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
    const { message, context, relationshipType = 'general', skipRFD = false } = JSON.parse(event.body);

    if (!message || message.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    console.log('Processing request:', { 
      messageLength: message.length, 
      hasContext: !!context,
      relationshipType,
      skipRFD 
    });

    // STEP 1: Check for INBOUND red flags (in their message - from context)
    if (!skipRFD && context) {
      // Parse to extract their actual message
      let theirMessage = '';
      const theirMessageMatch = context.match(/THEIR MESSAGE:\s*"?([^"]*)"?(?:\n|$)/i);
      if (theirMessageMatch) {
        theirMessage = theirMessageMatch[1].trim();
      }
      
      // Only check inbound if we have their actual message
      if (theirMessage && theirMessage.length > 10) {
        console.log('Checking inbound RFD on their message...');
        const inboundRFD = await detectRedFlags(theirMessage, 'inbound');
        
        if (inboundRFD.hasRedFlags) {
          console.log('Inbound RFD alert triggered:', inboundRFD.patterns);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              rfdAlert: true,
              rfdResult: inboundRFD,
            }),
          };
        }
      }
    }

    // STEP 2: Check for OUTBOUND red flags (in user's message)
    // This runs AFTER inbound check (if user clicked "Continue to reFrame")
    // OR if skipRFD=false and no inbound patterns found
    if (!skipRFD) {
      console.log('Checking outbound RFD on user message...');
      const outboundRFD = await detectRedFlags(message, 'outbound');
      
      if (outboundRFD.hasRedFlags) {
        console.log('Outbound RFD alert triggered:', outboundRFD.patterns);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rfdAlert: true,
            rfdResult: outboundRFD,
          }),
        };
      }
    }

    // STEP 3: No red flags detected (or skipRFD=true), proceed with reframing
    console.log('No RFD patterns detected, proceeding with reframe...');
    const reframed = await reframeMessage(message, context, relationshipType, skipRFD);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reframed,
        relationshipType,
        usedContext: !!context,
        rfdResult: null,
      }),
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
