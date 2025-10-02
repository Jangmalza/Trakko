import type { ChatMessage } from '../types/chatAssistant';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const ASSISTANT_ENDPOINT = API_BASE_URL.replace(/\/$/, '') + '/chat/assistant';

const extractErrorMessage = async (response: Response) => {
  try {
    const data = await response.clone().json();
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message?: unknown }).message || '');
    }
  } catch {
    // ignore, fall back to text
  }
  const text = await response.text();
  return text || `Assistant request failed (${response.status})`;
};

export async function sendAssistantMessages(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(ASSISTANT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const data = (await response.json()) as { message: string };
  return data.message;
}
