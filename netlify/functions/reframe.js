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

// Allowed relationship types (for input validation)
const ALLOWED_RELATIONSHIP_TYPES = [
  'romantic_partner', 'parent', 'family', 'friend', 'manager',
  'direct_report', 'colleague', 'client', 'neighbor', 'child',
  'provider', 'general'
];

// Input length limits
const MAX_MESSAGE_LENGTH = 5000;
const MAX_CONTEXT_LENGTH = 5000;

// Sanitize user input before embedding in LLM prompts to mitigate prompt injection.
// Uses clear delimiters and escapes sequences that could break out of quoted blocks.
function sanitizeForPrompt(input) {
  if (!input) return '';
  return input
    .replace(/"""/g, "'\"'")   // Escape triple-quote sequences
    .replace(/```/g, "'''")     // Escape backtick fences
    .slice(0, MAX_MESSAGE_LENGTH); // Enforce length limit
}

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
  provider: {
    tone: "clear and self-advocating",
    formality: "professional",
    approach: "Advocate for your needs while respecting expertise, ask questions, express concerns directly"
  },
  general: {
    tone: "balanced and thoughtful",
    formality: "moderate",
    approach: "Maintain dignity while expressing needs clearly"
  }
};

// ============================================
// QUESTION BANK - Fixed set of clarifying questions
// Claude selects from these by ID; frontend renders deterministically
// ============================================
const QUESTION_BANK = {
  desired_outcome: {
    id: 'desired_outcome',
    text: 'What outcome are you hoping for?',
    format: 'single_select',
    options: [
      { value: 'boundary', label: 'Set a boundary' },
      { value: 'repair', label: 'Repair the relationship' },
      { value: 'express', label: 'Express how I feel' },
      { value: 'deescalate', label: 'De-escalate' },
      { value: 'inform', label: 'Inform or deliver news' },
      { value: 'request', label: 'Request a change' }
    ],
    allow_other: true,
    required: true
  },
  pattern_duration: {
    id: 'pattern_duration',
    text: 'How long has this dynamic been going on?',
    format: 'single_select',
    options: [
      { value: 'new', label: 'This is new' },
      { value: 'weeks', label: 'Weeks' },
      { value: 'months', label: 'Months' },
      { value: 'years', label: 'Years' }
    ],
    allow_other: false,
    required: false
  },
  pattern_or_isolated: {
    id: 'pattern_or_isolated',
    text: 'Is this a recurring pattern or a one-time situation?',
    format: 'single_select',
    options: [
      { value: 'one_time', label: 'One-time situation' },
      { value: 'occasional', label: 'Happens occasionally' },
      { value: 'recurring', label: 'Recurring pattern' },
      { value: 'constant', label: 'Constant dynamic' }
    ],
    allow_other: false,
    required: false
  },
  emotional_state: {
    id: 'emotional_state',
    text: 'How are you feeling right now?',
    format: 'single_select',
    options: [
      { value: 'angry', label: 'Angry' },
      { value: 'hurt', label: 'Hurt' },
      { value: 'exhausted', label: 'Exhausted' },
      { value: 'anxious', label: 'Anxious' },
      { value: 'numb', label: 'Numb' },
      { value: 'disappointed', label: 'Disappointed' },
      { value: 'overwhelmed', label: 'Overwhelmed' }
    ],
    allow_other: true,
    required: false
  },
  relationship_type: {
    id: 'relationship_type',
    text: "What's your relationship with this person?",
    format: 'single_select',
    options: [
      { value: 'romantic_partner', label: 'Romantic Partner' },
      { value: 'parent', label: 'Parent' },
      { value: 'child', label: 'Child/Teen' },
      { value: 'family', label: 'Family Member' },
      { value: 'friend', label: 'Friend' },
      { value: 'manager', label: 'Manager' },
      { value: 'direct_report', label: 'Direct Report' },
      { value: 'colleague', label: 'Colleague' },
      { value: 'client', label: 'Client' },
      { value: 'provider', label: 'Provider' },
      { value: 'neighbor', label: 'Neighbor' }
    ],
    allow_other: false,
    required: true
  },
  audience_intent: {
    id: 'audience_intent',
    text: 'Will you send this message directly, or are you processing your thoughts?',
    format: 'single_select',
    options: [
      { value: 'sending', label: "I'm going to send this" },
      { value: 'processing', label: "I'm processing my thoughts" },
      { value: 'drafting', label: "I'm drafting — not sure yet" }
    ],
    allow_other: false,
    required: false
  },
  safety_check: {
    id: 'safety_check',
    text: 'Do you feel safe in this relationship?',
    format: 'single_select',
    options: [
      { value: 'yes', label: 'Yes, I feel safe' },
      { value: 'mostly', label: 'Mostly, but this dynamic concerns me' },
      { value: 'unsure', label: "I'm not sure" },
      { value: 'no', label: "No, I don't always feel safe" }
    ],
    allow_other: false,
    required: true,
    special_handling: true
  },
  boundary_history: {
    id: 'boundary_history',
    text: 'Have you tried setting this boundary before?',
    format: 'single_select',
    options: [
      { value: 'first_time', label: 'No, this is the first time' },
      { value: 'tried_failed', label: "Yes, but it didn't work" },
      { value: 'tried_partial', label: 'Yes, and it was partially respected' },
      { value: 'tried_many', label: "I've tried many times" }
    ],
    allow_other: false,
    required: false
  },
  desired_tone: {
    id: 'desired_tone',
    text: 'How do you want to come across?',
    format: 'single_select',
    options: [
      { value: 'firm', label: 'Firm' },
      { value: 'gentle', label: 'Gentle' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'direct', label: 'Direct' },
      { value: 'compassionate_clear', label: 'Compassionate but clear' }
    ],
    allow_other: false,
    required: false
  },
  stakes: {
    id: 'stakes',
    text: 'How important is this conversation to you?',
    format: 'single_select',
    options: [
      { value: 'low', label: "It matters, but it's not make-or-break" },
      { value: 'medium', label: "It's important — I want to get it right" },
      { value: 'high', label: 'This could significantly affect the relationship' },
      { value: 'critical', label: 'This feels like a turning point' }
    ],
    allow_other: false,
    required: false
  }
};

// Question selection rules (encoded for prompt and validation)
const QUESTION_SELECTION_RULES = {
  max_per_round: 3,
  max_rounds: 2,
  mutually_exclusive: [['pattern_duration', 'pattern_or_isolated']],
  safety_check_max_companions: 1,
  safety_check_requires_high_severity_inbound: true,
  relationship_type_only_when_general: true
};

// Build structured questions response from Claude's assessment
function buildQuestionsResponse(assessment, questionRound) {
  const questionIds = Array.isArray(assessment.questions_to_ask)
    ? assessment.questions_to_ask.filter(id => QUESTION_BANK[id]).slice(0, QUESTION_SELECTION_RULES.max_per_round)
    : [];

  const questions = questionIds.map(id => ({ ...QUESTION_BANK[id] }));

  // Add wildcard question if provided
  if (assessment.wildcard_question && typeof assessment.wildcard_question === 'string') {
    questions.push({
      id: 'wildcard',
      text: assessment.wildcard_question.slice(0, 500),
      format: 'free_text',
      options: [],
      allow_other: false,
      required: false
    });
  }

  return {
    questions,
    skip_allowed: true,
    skip_label: "Skip — reframe with what I've given you",
    question_round: questionRound + 1
  };
}

// Build enriched context string from original context + clarifying answers
function buildEnrichedContext(originalContext, clarifyingAnswers) {
  if (!clarifyingAnswers || clarifyingAnswers.length === 0) return originalContext;

  let enrichment = '\n\nADDITIONAL CONTEXT FROM USER:';
  for (const qa of clarifyingAnswers) {
    const answerDisplay = qa.custom_text
      ? `${qa.answer_text} — ${qa.custom_text}`
      : qa.answer_text;
    enrichment += `\n- ${qa.question_text}: ${answerDisplay}`;
  }

  return (originalContext || '') + enrichment;
}

// Lightweight context assessment (used when skipRFD=true, or for round 2)
async function assessContextSufficiency(message, context, relationshipType, clarifyingAnswers = []) {
  const hasContext = !!context && context.trim().length > 0;
  const hasTheirMessage = hasContext && /THEIR MESSAGE:/i.test(context);
  const hasSituation = hasContext && /SITUATION:/i.test(context);
  const answeredIds = clarifyingAnswers.map(a => a.id);

  const assessPrompt = `You are assessing whether you have sufficient context to produce a high-quality, intent-preserving message reframe.

INPUT PROVIDED:
- Message to reframe: "${sanitizeForPrompt(message).slice(0, 500)}"
- Relationship type: ${relationshipType}
- Their message provided: ${hasTheirMessage ? 'yes' : 'no'}
- Situation context provided: ${hasSituation ? 'yes' : 'no'}
${clarifyingAnswers.length > 0 ? `- Previously answered: ${answeredIds.join(', ')}` : '- No clarifying answers yet'}

Select 0-3 questions from this bank (by ID) if context is insufficient:

Available questions (DO NOT select any already answered):
- desired_outcome: When user's communicative goal is unclear
- pattern_duration: When recurring dynamic suspected (MUTUALLY EXCLUSIVE with pattern_or_isolated)
- pattern_or_isolated: When unclear if recurring (MUTUALLY EXCLUSIVE with pattern_duration)
- emotional_state: When message tone is ambiguous
- relationship_type: ONLY when relationship is "${relationshipType}" and that equals "general"
- audience_intent: When unclear if message will actually be sent
- boundary_history: When scenario involves setting a boundary
- desired_tone: When tone preference is unclear
- stakes: When conversation importance would change reframe approach

Rules:
- Select 0 questions if context is sufficient (MOST COMMON for detailed messages)
- Never select questions the user already answered
- pattern_duration and pattern_or_isolated are mutually exclusive
- Max 3 questions
- You may provide ONE custom clarification if the message has genuine semantic ambiguity

Respond with ONLY valid JSON:
{
  "sufficient_for_reframe": true/false,
  "questions_to_ask": [],
  "wildcard_question": null
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: assessPrompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Context assessment error:', error);
    // On failure, proceed to reframe (don't block user)
    return { sufficient_for_reframe: true, questions_to_ask: [], wildcard_question: null };
  }
}

// Relationship Health Check - detects objectively problematic situations
async function checkRelationshipHealth(context, message, relationshipType) {
  if (!context && !message) return null;
  
  const combinedText = `${context || ''} ${message || ''}`.toLowerCase();
  const contextLower = (context || '').toLowerCase();
  
  // Check for "other person" scenario
  const otherPersonKeywords = /girlfriend|boyfriend|married|wife|husband|partner.*has.*girlfriend|partner.*has.*boyfriend|seeing someone|in a relationship|dating someone/i;
  const secretKeywords = /secret|hide|don't tell|can't break up|awkward to break up|waiting to break up/i;
  
  if (otherPersonKeywords.test(combinedText) && secretKeywords.test(combinedText)) {
    // ONLY skip alert if parent→child (relationshipType = 'child')
    // DO show alert if child→parent (relationshipType = 'parent') - they need objective validation
    if (relationshipType === 'child') {
      // Parent talking TO child - check if parent already teaching this
      const parentGuidanceKeywords = /deserve better|first choice|respect yourself|healthy relationship|concerned|worried about you/i;
      if (parentGuidanceKeywords.test(contextLower)) {
        console.log('Parent→child: Parent already teaching - skip alert');
        return null;
      }
    }
    // If child→parent (relationshipType = 'parent'), SHOW alert - teen needs to see objective truth
    
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

Analyze this message THE USER RECEIVED (delimited by triple quotes below):

"""
${sanitizeForPrompt(message)}
"""

PATTERNS TO DETECT:
1. CRITICISM - Attacking character/personality rather than specific behavior
2. CONTEMPT - Disrespect, mockery, sarcasm, superiority, name-calling (MOST destructive)
3. DEFENSIVENESS - Playing victim, making excuses, counter-attacking, blame-shifting
4. STONEWALLING - Withdrawal, silent treatment, shutting down
5. GASLIGHTING - Denying reality, questioning sanity, rewriting history
6. MANIPULATION - Guilt-tripping, emotional blackmail, conditional love
7. THREATS - Ultimatums, abandonment threats, "or else" statements

${relationshipType === 'romantic_partner' ? `
SPECIAL CONTEXT - ROMANTIC PARTNER COMMUNICATION:
This message is from the user's ROMANTIC PARTNER. Pay special attention to:

HIGH-RISK PATTERNS:
- "I can't break up with [other person] because..." = MANIPULATION + STONEWALLING (keeping you as backup)
- "It would be awkward/uncomfortable to break up" = MANIPULATION (prioritizing comfort over your feelings)
- "I'm still with my girlfriend/boyfriend" while pursuing you = MANIPULATION (emotional cheating, making you "the other person")
- Giving excuses for staying with someone else while wanting relationship with user = HIGH severity MANIPULATION

These are SERIOUS red flags that often lead to long-term emotional harm. Flag them clearly.
` : ''}

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

Analyze this message THE USER IS ABOUT TO SEND (delimited by triple quotes below):

"""
${sanitizeForPrompt(message)}
"""

PATTERNS TO DETECT:
1. CRITICISM - Attacking character/personality rather than specific behavior
2. CONTEMPT - Disrespect, mockery, sarcasm, superiority, name-calling (MOST destructive)
3. DEFENSIVENESS - Playing victim, making excuses, counter-attacking, blame-shifting
4. STONEWALLING - Withdrawal, silent treatment, shutting down
5. GASLIGHTING - Denying reality, questioning sanity, rewriting history
6. MANIPULATION - Guilt-tripping, emotional blackmail, conditional love
7. THREATS - Ultimatums, abandonment threats, "or else" statements

${relationshipType === 'romantic_partner' ? `
SPECIAL CONTEXT - COMMUNICATING WITH ROMANTIC PARTNER:
When someone mentions their parent's concerns, family input, or external perspectives, this is NOT automatically manipulation:

DO NOT flag as manipulation when the user:
- Mentions what their parent/family thinks (this is sharing context, not emotional blackmail)
- Expresses uncertainty ("I'm not sure what to do") about a genuinely concerning situation
- Brings up legitimate safety or ethical concerns raised by trusted people
- Communicates confusion about the partner's conflicting actions (like still being with someone else)

ONLY flag as manipulation if clearly using external pressure maliciously:
- "My family will hate you if you don't..." (threat)
- "Everyone thinks you're terrible" (attacking with external validation)
- Using parent's disapproval as a weapon to control behavior

Remember: Sharing that a parent is concerned about an objectively concerning situation (like partner being in another relationship) is healthy communication, not manipulation. Expressing genuine confusion when receiving mixed messages is valid vulnerability, not emotional blackmail.
` : ''}

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

STEP 1 — RED FLAG DETECTION:
First, complete your forensic analysis of the message for toxic patterns.

STEP 2 — CONTEXT SUFFICIENCY ASSESSMENT:
After completing RFD analysis, perform a SEPARATE assessment: do you have sufficient context to produce a high-quality, intent-preserving reframe?

Consider what was provided:
- The message above
- Relationship type: ${relationshipType}
- Context about their message: ${context && /THEIR MESSAGE:/i.test(context) ? 'provided' : 'not provided'}
- Situation background: ${context && /SITUATION:/i.test(context) ? 'provided' : 'not provided'}

Select 0-3 question IDs if context is insufficient for a quality reframe:
- desired_outcome: When user's communicative goal is unclear (MOST VALUABLE — if asking only one, ask this)
- pattern_duration: When recurring dynamic suspected (MUTUALLY EXCLUSIVE with pattern_or_isolated)
- pattern_or_isolated: When unclear if recurring (MUTUALLY EXCLUSIVE with pattern_duration)
- emotional_state: When message tone is ambiguous between anger/hurt/exhaustion
- relationship_type: ONLY when relationship type is "general" (user skipped selection)
- audience_intent: When unclear if message will actually be sent
- safety_check: ONLY when HIGH severity coercive/threat patterns detected inbound — never with more than 1 other question
- boundary_history: When scenario involves setting a boundary
- desired_tone: When tone preference is unclear
- stakes: When conversation importance would change reframe approach

Select 0 questions if context is sufficient (MOST COMMON for detailed submissions with clear intent).

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "hasRedFlags": true/false,
  "severity": "low"/"medium"/"high",
  "patterns": ["PATTERN1", "PATTERN2"],
  "explanation": "Explain why the patterns in THEIR message are harmful to the relationship",
  "suggestion": "Suggest how THEY can express the same feelings/needs in a healthier way",
  "context_assessment": {
    "sufficient_for_reframe": true/false,
    "questions_to_ask": [],
    "wildcard_question": null
  }
}

CRITICAL: Write all explanations and suggestions for the SENDER (the user), NOT the recipient.
Example RIGHT: "Instead of attacking their character, express how their actions impact you"
Example WRONG: "They should respond by setting boundaries" (this would be for the recipient)

If NO toxic patterns detected, return:
{"hasRedFlags": false, "context_assessment": {"sufficient_for_reframe": true, "questions_to_ask": [], "wildcard_question": null}}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: detectionPrompt }],
    });

    const textContent = response.content.find(block => block.type === 'text')?.text || '';
    
    let cleanedText = textContent.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const parsed = JSON.parse(cleanedText);

    // Validate and extract only expected fields from LLM response
    const result = { hasRedFlags: !!parsed.hasRedFlags };
    if (result.hasRedFlags) {
      result.source = source;
      result.severity = ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium';
      result.patterns = Array.isArray(parsed.patterns) ? parsed.patterns.map(String).slice(0, 10) : [];
      result.explanation = typeof parsed.explanation === 'string' ? parsed.explanation.slice(0, 2000) : '';
      result.suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.slice(0, 2000) : '';
      if (parsed.validation && typeof parsed.validation === 'string') {
        result.validation = parsed.validation.slice(0, 2000);
      }
    }

    // Extract context assessment (outbound only)
    if (parsed.context_assessment && source === 'outbound') {
      result.context_assessment = {
        sufficient_for_reframe: !!parsed.context_assessment.sufficient_for_reframe,
        questions_to_ask: Array.isArray(parsed.context_assessment.questions_to_ask)
          ? parsed.context_assessment.questions_to_ask.filter(id => typeof id === 'string').slice(0, QUESTION_SELECTION_RULES.max_per_round)
          : [],
        wildcard_question: typeof parsed.context_assessment.wildcard_question === 'string'
          ? parsed.context_assessment.wildcard_question.slice(0, 500)
          : null
      };
    }

    return result;
  } catch (error) {
    console.error('RFD Detection Error:', error);
    return { hasRedFlags: false };
  }
}

// Reframing function — now accepts clarifying Q&A for enriched reframes
async function reframeMessage(message, context, relationshipType, clarifyingAnswers = []) {
  const relationshipContext = RELATIONSHIP_CONTEXTS[relationshipType] || RELATIONSHIP_CONTEXTS.general;

  let theirMessage = '';
  let situationContext = '';

  if (context) {
    const theirMessageMatch = context.match(/THEIR MESSAGE:\s*"?([^"]*)"?(?:\n|$)/i);
    const situationMatch = context.match(/SITUATION:\s*(.+?)(?:\n\nADDITIONAL CONTEXT|$)/is);

    if (theirMessageMatch) {
      theirMessage = theirMessageMatch[1].trim();
    }
    if (situationMatch) {
      situationContext = situationMatch[1].trim();
    }

    if (!theirMessage && !situationContext) {
      // Check if context has the ADDITIONAL CONTEXT section (from enriched context)
      const additionalMatch = context.match(/ADDITIONAL CONTEXT FROM USER:/i);
      if (additionalMatch) {
        situationContext = context.slice(0, additionalMatch.index).trim();
      } else {
        situationContext = context;
      }
    }
  }

  // Build clarifying context section for the prompt
  let clarifyingSection = '';
  if (clarifyingAnswers.length > 0) {
    clarifyingSection = '\nUSER CLARIFICATIONS (use these to calibrate the reframe):\n';
    for (const qa of clarifyingAnswers) {
      const answerDisplay = qa.custom_text
        ? `${qa.answer_text} — ${qa.custom_text}`
        : qa.answer_text;
      clarifyingSection += `- ${qa.question_text}: ${answerDisplay}\n`;
    }
  }

  const reframePrompt = `You are a communication coach using the R³ Framework (REGULATED, RESPECTFUL, REPAIRABLE).

RELATIONSHIP TYPE: ${relationshipType}
TONE: ${relationshipContext.tone}
FORMALITY: ${relationshipContext.formality}
APPROACH: ${relationshipContext.approach}

${theirMessage ? `THEIR MESSAGE TO USER (delimited by triple quotes):\n"""\n${sanitizeForPrompt(theirMessage)}\n"""\n\n` : ''}
${situationContext ? `SITUATION/BACKGROUND (delimited by triple quotes):\n"""\n${sanitizeForPrompt(situationContext)}\n"""\n\n` : ''}
${clarifyingSection}
USER'S RAW MESSAGE (what they want to say, delimited by triple quotes):
"""
${sanitizeForPrompt(message)}
"""

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
${clarifyingAnswers.some(a => a.id === 'desired_outcome') ? `8. The user's stated goal is "${clarifyingAnswers.find(a => a.id === 'desired_outcome').answer_text}" — optimize the reframe for this outcome` : ''}
${clarifyingAnswers.some(a => a.id === 'desired_tone') ? `9. The user wants to come across as "${clarifyingAnswers.find(a => a.id === 'desired_tone').answer_text}" — calibrate tone accordingly` : ''}
${clarifyingAnswers.some(a => a.id === 'audience_intent' && a.answer_value === 'processing') ? `10. The user is processing thoughts, not sending this directly — make the reframe more reflective and less tactical` : ''}

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
  // Restrict CORS to known origin(s). Set ALLOWED_ORIGIN env var in Netlify dashboard.
  // Falls back to wildcard only if not configured (dev convenience), but production should set this.
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
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

  // Validate Content-Type
  const contentType = (event.headers || {})['content-type'] || (event.headers || {})['Content-Type'] || '';
  if (event.httpMethod === 'POST' && !contentType.includes('application/json')) {
    return {
      statusCode: 415,
      headers,
      body: JSON.stringify({ error: 'Content-Type must be application/json' }),
    };
  }

  try {
    const {
      message,
      context,
      relationshipType = 'general',
      skipRFD = false,
      checkedInbound = false,
      sessionToken = null,  // For tracking anonymous users
      // SECURITY NOTE: When adding authentication, do NOT trust userId from the client.
      // Instead, extract it from a verified JWT/session token on the server side.
      userId = null,        // For authenticated users (future)
      // AskUserQuestionsTool fields
      stage = 'initial',    // 'initial' | 'reframe_with_answers'
      clarifyingAnswers = [],  // Array of { id, question_text, answer_value, answer_text, custom_text }
      questionRound = 0,    // Which round of questions (0 = none asked yet)
      skipQuestions = false  // User clicked "skip" on questions
    } = JSON.parse(event.body);

    if (!message || message.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Validate input lengths to prevent abuse
    if (message.length > MAX_MESSAGE_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` }),
      };
    }

    if (context && context.length > MAX_CONTEXT_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Context must be under ${MAX_CONTEXT_LENGTH} characters` }),
      };
    }

    // Validate relationshipType against allowlist
    const validatedRelationshipType = ALLOWED_RELATIONSHIP_TYPES.includes(relationshipType)
      ? relationshipType
      : 'general';

    // Validate clarifyingAnswers is array and sanitize
    const validatedAnswers = Array.isArray(clarifyingAnswers)
      ? clarifyingAnswers.filter(a => a && typeof a.id === 'string').slice(0, 10)
      : [];

    console.log('Request:', {
      messageLength: message.length,
      hasContext: !!context,
      relationshipType: validatedRelationshipType,
      skipRFD,
      checkedInbound,
      stage,
      questionRound,
      answersProvided: validatedAnswers.length,
      skipQuestions
    });

    // ========================================
    // NEW: Check for objective relationship health concerns
    // ========================================
    const healthCheck = await checkRelationshipHealth(context, message, validatedRelationshipType);
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
          relationship_type: validatedRelationshipType,
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

    // ========================================
    // STAGE ROUTING: reframe_with_answers
    // User answered clarifying questions — proceed to reframe
    // ========================================
    if (stage === 'reframe_with_answers') {
      console.log('Stage: reframe_with_answers, round:', questionRound, 'answers:', validatedAnswers.length);

      // Check if round 2 questions are needed (only if not skipping and round < max)
      if (!skipQuestions && questionRound < QUESTION_SELECTION_RULES.max_rounds && validatedAnswers.length > 0) {
        const assessment = await assessContextSufficiency(message, context, validatedRelationshipType, validatedAnswers);
        if (!assessment.sufficient_for_reframe && assessment.questions_to_ask.length > 0) {
          console.log('Round 2 questions needed:', assessment.questions_to_ask);
          const questionsResponse = buildQuestionsResponse(assessment, questionRound);

          // Log questions offered to DB
          if (sessionId) {
            try {
              await supabase.from('reframe_sessions').update({
                questions_offered: true,
                question_rounds: questionRound + 1
              }).eq('id', sessionId);
            } catch (dbError) {
              console.error('DB logging error (non-blocking):', dbError);
            }
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              type: 'questions',
              ...questionsResponse,
              healthCheck: healthCheck
            }),
          };
        }
      }

      // Build enriched context and reframe
      const enrichedContext = buildEnrichedContext(context, validatedAnswers);
      console.log('Reframing with enriched context, answers:', validatedAnswers.length);
      const reframed = await reframeMessage(message, enrichedContext, validatedRelationshipType, validatedAnswers);

      // Check for safety_check answer that requires resources
      const safetyAnswer = validatedAnswers.find(a => a.id === 'safety_check');
      const includeSafetyResources = safetyAnswer && ['no', 'unsure', 'mostly'].includes(safetyAnswer.answer_value);

      // Log to Supabase
      if (sessionId) {
        try {
          await supabase.from('reframe_sessions').update({
            reframe_with_context: true,
            questions_offered: true,
            questions_skipped: skipQuestions,
            question_rounds: questionRound,
            clarifying_qa: validatedAnswers.map(a => ({
              round: a.round || 1,
              id: a.id,
              answer_value: a.answer_value,
              answer_text: a.answer_text,
              custom_text: a.custom_text || null
            }))
          }).eq('id', sessionId);
        } catch (dbError) {
          console.error('DB logging error (non-blocking):', dbError);
        }
      }

      if (sessionId && userId) {
        try {
          await supabase.rpc('increment_user_reframes', { user_uuid: userId });
        } catch (dbError) {
          console.error('DB update error (non-blocking):', dbError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          type: 'reframe',
          reframed,
          relationshipType: validatedRelationshipType,
          usedContext: true,
          healthCheck: healthCheck,
          safetyResources: includeSafetyResources ? {
            show: true,
            message: "Your safety matters. If you're in a situation where you don't feel safe, these resources can help:",
            resources: [
              { name: 'National Domestic Violence Hotline', contact: '1-800-799-7233', url: 'https://www.thehotline.org' },
              { name: 'Crisis Text Line', contact: 'Text HOME to 741741', url: 'https://www.crisistextline.org' },
              { name: 'Love Is Respect', contact: '1-866-331-9474', url: 'https://www.loveisrespect.org' }
            ]
          } : null
        }),
      };
    }

    // ========================================
    // STAGE: initial — Full RFD + context assessment pipeline
    // ========================================

    // STEP 1: Check INBOUND (their message)
    if (!skipRFD && !checkedInbound && context) {
      console.log('STEP 1: Attempting inbound check...');
      let theirMessage = '';
      const theirMessageMatch = context.match(/THEIR MESSAGE:\s*["']*(.*?)["']*(?:\n\n|$)/is);
      if (theirMessageMatch) {
        theirMessage = theirMessageMatch[1].trim();
        theirMessage = theirMessage.replace(/^["']+|["']+$/g, '');
      }

      if (theirMessage && theirMessage.length > 10) {
        console.log('Checking inbound RFD, message length:', theirMessage.length);
        const inboundRFD = await detectRedFlags(theirMessage, 'inbound', validatedRelationshipType, context);

        if (inboundRFD.hasRedFlags) {
          console.log('Inbound alert:', inboundRFD.patterns);

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
              healthCheck: healthCheck
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

    // STEP 2: Check OUTBOUND (user's message) — now includes context assessment
    let contextAssessment = null;
    if (!skipRFD) {
      console.log('STEP 2: Checking outbound RFD (with context assessment)...');
      const outboundRFD = await detectRedFlags(message, 'outbound', validatedRelationshipType, context);

      // Save context assessment from the outbound call
      contextAssessment = outboundRFD.context_assessment || null;

      if (outboundRFD.hasRedFlags) {
        console.log('Outbound alert:', outboundRFD.patterns);

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
            healthCheck: healthCheck
          }),
        };
      } else {
        console.log('No outbound patterns found');
      }
    } else {
      console.log('STEP 2 skipped: skipRFD=true');
      // When skipRFD (user continued past outbound alert), do lightweight assessment
      if (!skipQuestions) {
        console.log('Running separate context assessment (skipRFD path)...');
        contextAssessment = await assessContextSufficiency(message, context, validatedRelationshipType);
      }
    }

    // STEP 3: Check if clarifying questions are needed
    if (!skipQuestions && contextAssessment && !contextAssessment.sufficient_for_reframe
        && contextAssessment.questions_to_ask && contextAssessment.questions_to_ask.length > 0) {
      console.log('Context insufficient, returning questions:', contextAssessment.questions_to_ask);
      const questionsResponse = buildQuestionsResponse(contextAssessment, 0);

      // Log questions offered
      if (sessionId) {
        try {
          await supabase.from('reframe_sessions').update({
            context_sufficient: false,
            questions_offered: true,
            question_rounds: 1
          }).eq('id', sessionId);
        } catch (dbError) {
          console.error('DB logging error (non-blocking):', dbError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          type: 'questions',
          ...questionsResponse,
          healthCheck: healthCheck
        }),
      };
    }

    // STEP 4: Context sufficient — proceed to reframe
    console.log('Proceeding with reframe');
    const reframed = await reframeMessage(message, context, validatedRelationshipType);

    // Log context sufficiency
    if (sessionId) {
      try {
        await supabase.from('reframe_sessions').update({
          context_sufficient: true,
          questions_offered: false,
          reframe_with_context: false
        }).eq('id', sessionId);
      } catch (dbError) {
        console.error('DB logging error (non-blocking):', dbError);
      }
    }

    if (sessionId && userId) {
      try {
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
        type: 'reframe',
        reframed,
        relationshipType: validatedRelationshipType,
        usedContext: !!context,
        healthCheck: healthCheck
      }),
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};
