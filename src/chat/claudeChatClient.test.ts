import { describe, expect, it, vi } from 'vitest';
import { createClaudeChatClient } from './claudeChatClient';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('createClaudeChatClient', () => {
  it('POSTs to the Anthropic messages endpoint with model, system, history and the new user message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'Hallo!' }] }));
    const client = createClaudeChatClient(fetchMock);

    await client.sendMessage({
      system: 'context here',
      history: [{ role: 'user', content: 'erste Frage' }, { role: 'assistant', content: 'erste Antwort' }],
      userText: 'zweite Frage',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.system).toBe('context here');
    expect(body.messages).toEqual([
      { role: 'user', content: 'erste Frage' },
      { role: 'assistant', content: 'erste Antwort' },
      { role: 'user', content: 'zweite Frage' },
    ]);
  });

  it('returns the text content of a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'die Antwort' }] }));
    const client = createClaudeChatClient(fetchMock);

    const reply = await client.sendMessage({ system: 's', history: [], userText: 'frage' });

    expect(reply).toBe('die Antwort');
  });

  it('throws a descriptive, claude.ai-aware error when the response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 403));
    const client = createClaudeChatClient(fetchMock);

    await expect(client.sendMessage({ system: 's', history: [], userText: 'frage' })).rejects.toThrow(/claude\.ai/i);
  });

  it('throws when the response has no text content block', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [] }));
    const client = createClaudeChatClient(fetchMock);

    await expect(client.sendMessage({ system: 's', history: [], userText: 'frage' })).rejects.toThrow();
  });

  it('propagates a network-level fetch rejection (e.g. blocked outside claude.ai)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = createClaudeChatClient(fetchMock);

    await expect(client.sendMessage({ system: 's', history: [], userText: 'frage' })).rejects.toThrow(
      'Failed to fetch',
    );
  });
});
