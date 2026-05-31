import { isFinalResponse, stringifyContent, getFunctionResponses } from '@google/adk';
import { intakeRunner } from '../agents/intakeAgent.js';

export type ChatResult = {
  assistantMessage: string;
  createdTicketId?: string;
};

function sessionKey(userId: string, societyId: string): string {
  return `${userId}__${societyId}`;
}

// Track which sessionIds we've initialized so we only call createSession once per key.
const initialized = new Set<string>();

async function ensureSession(userId: string, sessionId: string): Promise<void> {
  if (initialized.has(sessionId)) return;
  // InMemorySessionService.createSession is idempotent in practice; we just don't want
  // to call it on every turn. If it errors here, log and let runAsync handle it.
  try {
    await intakeRunner.sessionService.createSession({
      appName: intakeRunner.appName,
      userId,
      sessionId,
    } as { appName: string; userId: string; sessionId: string });
  } catch {
    // ignore — session may already exist
  }
  initialized.add(sessionId);
}

export async function chat(
  userId: string,
  societyId: string,
  message: string,
): Promise<ChatResult> {
  const sessionId = sessionKey(userId, societyId);
  await ensureSession(userId, sessionId);

  const events = intakeRunner.runAsync({
    userId,
    sessionId,
    newMessage: { role: 'user', parts: [{ text: message }] },
    stateDelta: { userId, societyId },
  });

  let assistantMessage = '';
  let createdTicketId: string | undefined;
  let lastErrorMessage: string | undefined;
  let lastErrorCode: string | undefined;

  for await (const event of events) {
    if (event.errorMessage) {
      lastErrorMessage = event.errorMessage;
      lastErrorCode = event.errorCode;
    }
    // Capture create_ticket tool result if it fired this turn
    const responses = getFunctionResponses(event);
    for (const r of responses) {
      if (r.name === 'create_ticket' && r.response && typeof r.response === 'object') {
        const resp = r.response as { id?: unknown };
        if (typeof resp.id === 'string') createdTicketId = resp.id;
      }
    }
    if (isFinalResponse(event)) {
      const text = stringifyContent(event);
      if (text) assistantMessage = text;
    }
  }

  if (!assistantMessage) {
    if (lastErrorMessage) {
      const upstream =
        lastErrorCode === '503'
          ? 'The AI is busy right now — please try again in a moment.'
          : lastErrorMessage;
      const err = new Error(upstream) as Error & { status?: number };
      err.status = lastErrorCode === '503' ? 503 : 502;
      throw err;
    }
    assistantMessage = createdTicketId
      ? 'Got it — your ticket has been filed.'
      : 'Sorry, I didn’t catch that. Could you say it again?';
  }

  return { assistantMessage, createdTicketId };
}
