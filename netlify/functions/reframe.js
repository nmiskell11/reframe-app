// netlify/functions/reframe.js
// SIMPLE Two-Way RFD Detection

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Relationship contexts (unchanged)
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

// RFD Detection Function
async function detectRedFlags(message, source = 'outbound') {
  const detectionPrompt = `You are a relationship psychology expert analyzing communication patterns based on Dr. John Gottman's "Four Horsemen" research.

Analyze this message for toxic communication patterns:

"${message}"

PATTERNS TO DETECT:
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
  "validation": "Validation message (only for inbound messages)"
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
    
    let cleanedText = textContent.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const result = JSON.parse(cleanedText);
    
    if (result.hasRedFlags) {
      result.source = source;
      
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

// Reframing function
async function reframeMessage(message, context, relationshipType) {
  const relationshipContext = RELATIONSHIP_CONTEXTS[relationshipType] || RELATIONSHIP_CONTEXTS.general;
  
  let theirMessage = '';
  let situationContext = '';
  
  if (context) {
    const theirMessageMatch = context.match(/THEIR MESSAGE:\s*"?([^"]*)"?(?:\n|$)/i);
    const situationMatch = context.match(/SITUATION:\s*(.+)/is);
    
    if (theirMessageMatch) {
      theirMessage = theirMessageMatch[1].trim();
    }
    if (situationMatch) {
      situationContext = situationMatch[1].trim();
    }
    
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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
      skipRFD = false,
      checkedInbound = false  // NEW: Track if we already checked inbound
    } = JSON.parse(event.body);

    if (!message || message.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    console.log('Request:', { 
      hasMessage: true,
      messageLength: message.length,
      hasContext: !!context,
      contextPreview: context ? context.substring(0, 100) : 'none',
      relationshipType,
      skipRFD,
      checkedInbound
    });

    // STEP 1: Check INBOUND (their message) - only if we haven't already
    if (!skipRFD && !checkedInbound && context) {
      console.log('STEP 1: Attempting inbound check...');
      let theirMessage = '';
      // More flexible regex - handles: THEIR MESSAGE: text OR THEIR MESSAGE: "text" OR THEIR MESSAGE: ""text""
      const theirMessageMatch = context.match(/THEIR MESSAGE:\s*["']*(.*?)["']*(?:\n\n|$)/is);
      console.log('Regex match result:', theirMessageMatch ? 'FOUND' : 'NOT FOUND');
      
      if (theirMessageMatch) {
        theirMessage = theirMessageMatch[1].trim();
        // Remove any remaining quotes
        theirMessage = theirMessage.replace(/^["']+|["']+$/g, '');
        console.log('Their message extracted:', theirMessage.substring(0, 50) + '...');
      }
      
      if (theirMessage && theirMessage.length > 10) {
        console.log('Checking inbound RFD on message length:', theirMessage.length);
        const inboundRFD = await detectRedFlags(theirMessage, 'inbound');
        console.log('Inbound RFD result:', inboundRFD);
        
        if (inboundRFD.hasRedFlags) {
          console.log('Inbound alert:', inboundRFD.patterns);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              rfdAlert: true,
              rfdResult: inboundRFD,
              checkedInbound: true  // Tell frontend we checked this
            }),
          };
        } else {
          console.log('No inbound patterns found');
        }
      } else {
        console.log('Their message too short or missing:', theirMessage ? theirMessage.length : 'null');
      }
    } else {
      console.log('STEP 1 skipped:', { skipRFD, checkedInbound, hasContext: !!context });
    }

    // STEP 2: Check OUTBOUND (user's message) - only if not skipping
    if (!skipRFD) {
      console.log('STEP 2: Checking outbound RFD on user message...');
      console.log('User message preview:', message.substring(0, 50) + '...');
      const outboundRFD = await detectRedFlags(message, 'outbound');
      console.log('Outbound RFD result:', outboundRFD);
      
      if (outboundRFD.hasRedFlags) {
        console.log('Outbound alert:', outboundRFD.patterns);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rfdAlert: true,
            rfdResult: outboundRFD,
          }),
        };
      } else {
        console.log('No outbound patterns found');
      }
    } else {
      console.log('STEP 2 skipped: skipRFD=true');
    }

    // STEP 3: No patterns found (or skipping), do the reframe
    console.log('Proceeding with reframe');
    const reframed = await reframeMessage(message, context, relationshipType);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reframed,
        relationshipType,
        usedContext: !!context,
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
