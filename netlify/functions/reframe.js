// netlify/functions/reframe.js
// Two-Way RFD Detection WITH Supabase Tracking

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Supabase (using service role for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service role bypasses RLS, needed for backend
);

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

// Relationship Health Check - detects objectively problematic situations
async function checkRelationshipHealth(context, message, relationshipType) {
  if (!context && !message) return null;
  
  const combinedText = `${context || ''} ${message || ''}`.toLowerCase();
  
  // Check for "other person" scenario
  const otherPersonKeywords = /girlfriend|boyfriend|married|wife|husband|partner.*has.*girlfriend|partner.*has.*boyfriend|seeing someone|in a relationship|dating someone/i;
  const secretKeywords = /secret|hide|don't tell|can't break up|awkward to break up|waiting to break up/i;
  
  if (otherPersonKeywords.test(combinedText) && secretKeywords.test(combinedText)) {
    return {
      type: 'other_person',
      severity: 'high',
      alert: '⚠️ Relationship Health Concern',
      message: 'Being romantically involved with someone who is in a committed relationship puts you in a compromised position. Regardless of the reasons given ("awkward," "waiting for the right time"), this situation is unlikely to be healthy for anyone involved. You deserve to be someone\'s first choice, not a secret or a backup plan.'
    };
  }
  
  // Check for age-inappropriate relationships (if user is teen/child)
  if (relationshipType === 'child' || relationshipType === 'parent') {
    const ageGapKeywords = /much older|adult.*relationship|age.*gap|[0-9]{2}.*years.*older/i;
    if (ageGapKeywords.test(combinedText)) {
      return {
        type: 'age_concern',
        severity: 'high',
        alert: '⚠️ Safety Concern',
        message: 'If you\'re in a relationship with someone significantly older, this raises important safety questions. Please talk to a trusted adult about this situation.'
      };
    }
  }
  
  // Check for controlling behavior
  const controlKeywords = /track.*phone|check.*phone|monitor.*location|can't see.*friends|isolate|control.*who.*talk/i;
  if (controlKeywords.test(combinedText)) {
    return {
      type: 'controlling',
      severity: 'high',
      alert: '⚠️ Relationship Health Concern',
      message: 'Controlling behaviors like tracking your phone, monitoring your location, or limiting who you can see are warning signs of an unhealthy relationship. Everyone deserves privacy and autonomy.'
    };
  }
  
  return null;
}

// RFD Detection Function with Parent-Child Context Awareness
async function detectRedFlags(message, source = 'outbound', relationshipType = 'general', context = '') {
  let detectionPrompt;
  
  if (source === 'inbound') {
    detectionPrompt = `You are a relationship psychology expert analyzing communication patterns based on Dr. John Gottman's "Four Horsemen" research.

CRITICAL CONTEXT: You are analyzing a message that the USER RECEIVED from someone else. Your job is to:
1. Identify toxic patterns in THEIR message (the one they received)
2. Explain what's happening from the USER'S perspective (the recipient)
3. Validate the user's perception if they're being manipulated/criticized
4. Suggest how the USER can respond in a healthy way

Analyze this message THE USER RECEIVED:

"${message}"

PATTERNS TO DETECT:
1. CRITICISM - Attacking character/personality rather than specific behavior
2. CONTEMPT - Disrespect, mockery, sarcasm, superiority, name-calling (MOST destructive)
3. DEFENSIVENESS - Playing victim, making excuses, counter-attacking, blame-shifting
4. STONEWALLING - Withdrawal, silent treatment, shutting down
5. GASLIGHTING - Denying reality, questioning sanity, rewriting history
6. MANIPULATION - Guilt-tripping, emotional blackmail, conditional love
7. THREATS - Ultimatums, abandonment threats, "or else" statements

${relationshipType === 'parent' ? `
SPECIAL CONTEXT - PARENT TO CHILD COMMUNICATION:
This message is from the user's PARENT. Parents have a responsibility to guide, protect, and teach their children. Apply different standards:

Before flagging parental communication as toxic, ask:
1. Is the parent expressing concern for the child's safety/wellbeing?
2. Is the parent teaching ethical or moral boundaries?
3. Is the parent's ultimate goal the child's best interest (even if imperfectly expressed)?
4. Does the situation involve objective safety or ethical concerns (e.g., being "the other person" in a relationship)?

ONLY flag as toxic if the parent:
- Threatens withdrawal of love or abandonment
- Shows contempt for the child's inherent worth as a person
- Prioritizes the parent's control needs over the child's wellbeing
- Uses fear or shame primarily to manipulate emotions (not to teach consequences)

DO NOT flag as toxic if the parent:
- Expresses disappointment in a specific behavior (not the child's character)
- Sets boundaries to protect the child from harm
- Teaches right from wrong or ethical principles
- Holds the child accountable for actions with harmful consequences
- Uses strong language to warn about objective dangers
- References their parenting to teach values or express concern

Valid parental guidance and protection ≠ manipulation. Parents SHOULD express concern, set boundaries, and teach values.
` : ''}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "hasRedFlags": true/false,
  "severity": "low"/"medium"/"high",
  "patterns": ["PATTERN1", "PATTERN2"],
  "explanation": "Explain what THEY are doing and why it's harmful (from user's perspective as the RECIPIENT)",
  "suggestion": "Suggest how the USER can respond to this message in a healthy way",
  "validation": "Validate the user's perception: 'Your feelings about this are valid. [specific validation]'"
}

CRITICAL: Write all explanations and suggestions for the RECIPIENT (the user), NOT the sender.
Example WRONG: "Express your feelings using I-statements" (this is advice for the sender)
Example RIGHT: "They're expressing hurt through criticism. You can acknowledge their feelings while setting boundaries."

If NO toxic patterns detected, return:
{"hasRedFlags": false}`;
  } else {
    detectionPrompt = `You are a relationship psychology expert analyzing communication patterns based on Dr. John Gottman's "Four Horsemen" research.

CRITICAL CONTEXT: You are analyzing a message that the USER is about to SEND. Your job is to:
1. Identify toxic patterns in THEIR message (the one they're about to send)
2. Explain why these patterns are harmful to the relationship
3. Suggest how THEY can express the same feelings in a healthier way

Analyze this message THE USER IS ABOUT TO SEND:

"${message}"

PATTERNS TO DETECT:
1. CRITICISM - Attacking character/personality rather than specific behavior
2. CONTEMPT - Disrespect, mockery, sarcasm, superiority, name-calling (MOST destructive)
3. DEFENSIVENESS - Playing victim, making excuses, counter-attacking, blame-shifting
4. STONEWALLING - Withdrawal, silent treatment, shutting down
5. GASLIGHTING - Denying reality, questioning sanity, rewriting history
6. MANIPULATION - Guilt-tripping, emotional blackmail, conditional love
7. THREATS - Ultimatums, abandonment threats, "or else" statements

${relationshipType === 'child' ? `
SPECIAL CONTEXT - PARENT TO CHILD COMMUNICATION:
This message is from a PARENT to their CHILD/TEEN. Parents have a responsibility to guide, protect, and teach. Apply different standards:

Parents SHOULD and are EXPECTED to:
- Express disappointment in harmful or risky behaviors
- Set clear boundaries to protect the child's safety and wellbeing
- Teach moral and ethical principles
- Hold children accountable for their actions
- Use strong language when warning about genuine dangers
- Share their values and expectations
- Reference their parenting efforts in context of teaching values

DO NOT flag as "manipulation" or "criticism" when a parent:
- Expresses concern about the child's safety or wellbeing
- References their parenting efforts ("I raised you better") in context of teaching values
- Uses guilt appropriately to teach consequences of harmful behavior
- Sets protective boundaries even when the child disagrees
- Teaches right from wrong with conviction
- Expresses disappointment in risky or unethical behavior
- Warns about objective dangers with emotional language

ONLY flag as toxic if the parent:
- Threatens abandonment or withdrawal of love as punishment
- Attacks the child's inherent worth or character (not their behavior)
- Prioritizes the parent's needs over the child's actual safety
- Shows contempt for the child as a person
- Uses fear/shame purely for control (not to teach real consequences)

Remember: A parent saying "I raised you better than this" when addressing genuinely harmful behavior (like being "the other person" in a relationship) is appropriate parenting, not manipulation. A parent expressing disappointment about risky choices is protective, not criticism. A parent teaching ethical boundaries with conviction is their duty, not abuse.
` : ''}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "hasRedFlags": true/false,
  "severity": "low"/"medium"/"high",
  "patterns": ["PATTERN1", "PATTERN2"],
  "explanation": "Explain why the patterns in THEIR message are harmful to the relationship",
  "suggestion": "Suggest how THEY can express the same feelings/needs in a healthier way"
}

CRITICAL: Write all explanations and suggestions for the SENDER (the user), NOT the recipient.
Example RIGHT: "Instead of attacking their character, express how their actions impact you"
Example WRONG: "They should respond by setting boundaries" (this would be for the recipient)

If NO toxic patterns detected, return:
{"hasRedFlags": false}`;
  }

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
    }
    
    return result;
  } catch (error) {
    console.error('RFD Detection Error:', error);
    return { hasRedFlags: false };
  }
}

// Reframing function (unchanged)
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

// Main handler (UPDATED with Supabase tracking)
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
      checkedInbound = false,
      sessionToken = null,  // NEW: For tracking anonymous users
      userId = null         // NEW: For authenticated users (future)
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
      checkedInbound,
      hasSessionToken: !!sessionToken
    });

    // ========================================
    // NEW: Check for objective relationship health concerns
    // ========================================
    const healthCheck = await checkRelationshipHealth(context, message, relationshipType);
    if (healthCheck) {
      console.log('Relationship health concern detected:', healthCheck.type);
      // We'll still proceed with RFD, but frontend can show this alert too
      // or we could return it here to show first
    }

    // ========================================
    // NEW: Create session record in Supabase
    // ========================================
    let sessionId = null;
    try {
      const { data: session, error: sessionError } = await supabase
        .from('reframe_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          relationship_type: relationshipType,
          had_context: !!context && context.trim().length > 0,
          context_length: context ? context.length : 0,
          message_length: message.length
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        // Continue anyway - don't block user if DB fails
      } else {
        sessionId = session?.id;
        console.log('Session created:', sessionId);
      }
    } catch (dbError) {
      console.error('Database error (non-blocking):', dbError);
    }

    // STEP 1: Check INBOUND (their message)
    if (!skipRFD && !checkedInbound && context) {
      console.log('STEP 1: Attempting inbound check...');
      let theirMessage = '';
      const theirMessageMatch = context.match(/THEIR MESSAGE:\s*["']*(.*?)["']*(?:\n\n|$)/is);
      console.log('Regex match result:', theirMessageMatch ? 'FOUND' : 'NOT FOUND');
      
      if (theirMessageMatch) {
        theirMessage = theirMessageMatch[1].trim();
        theirMessage = theirMessage.replace(/^["']+|["']+$/g, '');
        console.log('Their message extracted:', theirMessage.substring(0, 50) + '...');
      }
      
      if (theirMessage && theirMessage.length > 10) {
        console.log('Checking inbound RFD on message length:', theirMessage.length);
        const inboundRFD = await detectRedFlags(theirMessage, 'inbound', relationshipType, context);
        console.log('Inbound RFD result:', inboundRFD);
        
        if (inboundRFD.hasRedFlags) {
          console.log('Inbound alert:', inboundRFD.patterns);

          // ========================================
          // NEW: Log inbound RFD detection to DB
          // ========================================
          if (sessionId) {
            try {
              await supabase.from('reframe_sessions').update({
                rfd_inbound_triggered: true,
                rfd_inbound_patterns: inboundRFD.patterns,
                rfd_inbound_severity: inboundRFD.severity
              }).eq('id', sessionId);

              await supabase.from('rfd_detections').insert({
                session_id: sessionId,
                detection_type: 'inbound',
                patterns_detected: inboundRFD.patterns,
                severity: inboundRFD.severity,
                explanation: inboundRFD.explanation,
                suggestion: inboundRFD.suggestion,
                user_saw_warning: true
              });
              console.log('Inbound RFD logged to database');
            } catch (dbError) {
              console.error('DB logging error (non-blocking):', dbError);
            }
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              rfdAlert: true,
              rfdResult: inboundRFD,
              checkedInbound: true,
              healthCheck: healthCheck,  // NEW: Include relationship health alert
              sessionId: sessionId  // NEW: Return session ID
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

    // STEP 2: Check OUTBOUND (user's message)
    if (!skipRFD) {
      console.log('STEP 2: Checking outbound RFD on user message...');
      console.log('User message preview:', message.substring(0, 50) + '...');
      const outboundRFD = await detectRedFlags(message, 'outbound', relationshipType, context);
      console.log('Outbound RFD result:', outboundRFD);
      
      if (outboundRFD.hasRedFlags) {
        console.log('Outbound alert:', outboundRFD.patterns);

        // ========================================
        // NEW: Log outbound RFD detection to DB
        // ========================================
        if (sessionId) {
          try {
            await supabase.from('reframe_sessions').update({
              rfd_outbound_triggered: true,
              rfd_outbound_patterns: outboundRFD.patterns,
              rfd_outbound_severity: outboundRFD.severity
            }).eq('id', sessionId);

            await supabase.from('rfd_detections').insert({
              session_id: sessionId,
              detection_type: 'outbound',
              patterns_detected: outboundRFD.patterns,
              severity: outboundRFD.severity,
              explanation: outboundRFD.explanation,
              suggestion: outboundRFD.suggestion,
              user_saw_warning: true
            });
            console.log('Outbound RFD logged to database');
          } catch (dbError) {
            console.error('DB logging error (non-blocking):', dbError);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rfdAlert: true,
            rfdResult: outboundRFD,
            healthCheck: healthCheck,  // NEW: Include relationship health alert
            sessionId: sessionId  // NEW: Return session ID
          }),
        };
      } else {
        console.log('No outbound patterns found');
      }
    } else {
      console.log('STEP 2 skipped: skipRFD=true');
    }

    // STEP 3: No patterns found, do the reframe
    console.log('Proceeding with reframe');
    const reframed = await reframeMessage(message, context, relationshipType);

    // ========================================
    // NEW: Update session as completed
    // ========================================
    if (sessionId && userId) {
      try {
        // Increment user's total reframes (will create function for this)
        await supabase.rpc('increment_user_reframes', { user_uuid: userId });
        console.log('User reframe count incremented');
      } catch (dbError) {
        console.error('DB update error (non-blocking):', dbError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reframed,
        relationshipType,
        usedContext: !!context,
        healthCheck: healthCheck,  // NEW: Include relationship health alert
        sessionId: sessionId  // NEW: Return session ID for frontend tracking
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
