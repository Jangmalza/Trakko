import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TradeEntry } from '../data/portfolioTypes';
import { formatCurrency, formatSignedCurrency } from '../utils/formatCurrency';
import type { ChatMessage } from '../types/chatAssistant';
import { sendAssistantMessages } from '../api/chatAssistantApi';

interface ChatAssistantPanelProps {
  trades: TradeEntry[];
  initialSeed: number | null;
  onClose: () => void;
}

interface AssistantMessage extends ChatMessage {
  id: string;
  createdAt: string;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  '이번 주 거래 요약해줘',
  '최근 손실 패턴이 있나?',
  '다음 거래에서 주의할 점은?',
  '리스크 관리 팁 알려줘'
];

const ChatAssistantPanel: React.FC<ChatAssistantPanelProps> = ({ trades, initialSeed, onClose }) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const summary = useMemo(() => {
    if (initialSeed === null) {
      return null;
    }

    const totalPnL = trades.reduce((acc, trade) => acc + trade.profitLoss, 0);
    const currentCapital = initialSeed + totalPnL;
    const wins = trades.filter((trade) => trade.profitLoss >= 0).length;
    const losses = trades.length - wins;

    return {
      totalPnL,
      currentCapital,
      wins,
      losses,
      totalTrades: trades.length
    };
  }, [trades, initialSeed]);

  useEffect(() => {
    const now = new Date().toISOString();
    const introContent = summary
      ? `안녕하세요! 현재 총 손익은 ${formatSignedCurrency(summary.totalPnL)}이고 자본 잔액은 ${formatCurrency(summary.currentCapital)}입니다. 궁금한 것이 있으면 물어보세요.`
      : '안녕하세요! 아직 초기 시드 또는 거래 데이터가 없네요. 첫 거래를 기록하면 더 정확한 인사이트를 드릴 수 있어요.';

    setMessages((current) => {
      if (current.some((message) => message.id === 'intro')) {
        return current.map((message) =>
          message.id === 'intro' ? { ...message, content: introContent } : message
        );
      }
      return [
        {
          id: 'intro',
          role: 'assistant',
          content: introContent,
          createdAt: now
        },
        ...current
      ];
    });
  }, [summary]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const timestamp = new Date().toISOString();
    const userMessage: AssistantMessage = {
      id: `user-${timestamp}`,
      role: 'user',
      content: trimmed,
      createdAt: timestamp
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);

    try {
      const history: ChatMessage[] = [...messages, userMessage]
        .filter((message) => !message.isError)
        .map(({ role, content }) => ({ role, content }))
        .slice(-10);

      const reply = await sendAssistantMessages(history);

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : '어시스턴트 응답에 실패했습니다.',
          createdAt: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  }, [input, sendMessage]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    void sendMessage(prompt);
  }, [sendMessage]);

  const disabled = sending || input.trim().length === 0;

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">AI Assistant</p>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Trakko Insights</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          닫기
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
        <div className="space-y-4">
          {summary ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">현재 요약</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">총 손익</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatSignedCurrency(summary.totalPnL)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">현재 자본</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(summary.currentCapital)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">승률</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {summary.totalTrades === 0 ? '데이터 없음' : `${Math.round((summary.wins / summary.totalTrades) * 100)}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">총 거래 수</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{summary.totalTrades}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              아직 초기 시드나 거래가 없습니다. 데이터를 추가하면 맞춤형 분석을 제공할 수 있어요.
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">빠른 질문</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={sending}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : message.isError
                        ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="무엇이 궁금한가요?"
            className="flex-1 resize-none rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
          />
          <button
            type="submit"
            disabled={disabled}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {sending ? '응답 대기...' : '보내기'}
          </button>
        </form>
      </footer>
    </aside>
  );
};

export default ChatAssistantPanel;
