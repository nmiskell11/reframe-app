import type { RelationshipType } from '@/lib/constants'
import type { DetectionDirection, RFDResult, Severity } from '@/types/rfd'
import { getAnthropic, MODEL } from '@/lib/anthropic/client'
import { sanitizeForPrompt } from './sanitize'

// --- Prompt Builders ---
// These prompts encode patent-claimed behavior. Do not refactor without
// understanding the impact on patent claim coverage (see CLAUDE.md).

function buildInboundPrompt(message: string, relationshipType: RelationshipType): string {
  return `You are a relationship psychology expert analyzing communication patterns based on Dr. John Gottman's "Four Horsemen" research.

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
{"hasRedFlags": false}`
}

function buildOutboundPrompt(message: string, relationshipType: RelationshipType): string {
  return `You are a relationship psychology expert analyzing communication patterns based on Dr. John Gottman's "Four Horsemen" research.

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
{"hasRedFlags": false}`
}

// --- Parsing ---

const VALID_SEVERITIES: readonly Severity[] = ['low', 'medium', 'high']

function parseDetectionResponse(raw: string, source: DetectionDirection): RFDResult {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  }

  const parsed = JSON.parse(cleaned)

  const result: RFDResult = {
    hasRedFlags: !!parsed.hasRedFlags,
    source,
  }

  if (result.hasRedFlags) {
    result.severity = VALID_SEVERITIES.includes(parsed.severity)
      ? parsed.severity
      : 'medium'
    result.patterns = Array.isArray(parsed.patterns)
      ? parsed.patterns.map(String).slice(0, 10)
      : []
    result.explanation =
      typeof parsed.explanation === 'string'
        ? parsed.explanation.slice(0, 2000)
        : ''
    result.suggestion =
      typeof parsed.suggestion === 'string'
        ? parsed.suggestion.slice(0, 2000)
        : ''
    if (parsed.validation && typeof parsed.validation === 'string') {
      result.validation = parsed.validation.slice(0, 2000)
    }
  }

  return result
}

// --- Main Detection ---

export async function detectRedFlags(
  message: string,
  source: DetectionDirection,
  relationshipType: RelationshipType,
  _context?: string
): Promise<RFDResult> {
  const prompt =
    source === 'inbound'
      ? buildInboundPrompt(message, relationshipType)
      : buildOutboundPrompt(message, relationshipType)

  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    return parseDetectionResponse(text, source)
  } catch (error) {
    console.error('RFD Detection Error:', error)
    return { hasRedFlags: false, source }
  }
}
