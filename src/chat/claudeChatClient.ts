import type { ChatMessage } from '../domain/progress/progressModel';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;

export interface SendMessageParams {
  system: string;
  history: ChatMessage[];
  userText: string;
}

export interface ClaudeChatClient {
  sendMessage(params: SendMessageParams): Promise<string>;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content?: AnthropicContentBlock[];
}

/**
 * Calls `fetch("https://api.anthropic.com/v1/messages")` directly from the
 * browser — the same call the prototype made. This only succeeds when the
 * built page is opened inside a claude.ai chat, which proxies this specific
 * call for free without an API key; anywhere else it fails (CORS/network),
 * which is surfaced as a thrown error, not silently swallowed. `fetchImpl` is
 * injectable so this stays testable with a mocked fetch and never makes a
 * real network call in tests.
 */
export function createClaudeChatClient(fetchImpl: typeof fetch = fetch): ClaudeChatClient {
  async function sendMessage({ system, history, userText }: SendMessageParams): Promise<string> {
    const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [...history, { role: 'user', content: userText }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Claude-Anfrage fehlgeschlagen (Status ${response.status}). ` +
          'Der Chat funktioniert nur, wenn diese Seite in einem claude.ai-Chat geöffnet ist.',
      );
    }

    const data = (await response.json()) as AnthropicMessagesResponse;
    const text = data.content?.find((block) => block.type === 'text')?.text;
    if (!text) {
      throw new Error('Claude hat keine Textantwort geliefert.');
    }
    return text;
  }

  return { sendMessage };
}
