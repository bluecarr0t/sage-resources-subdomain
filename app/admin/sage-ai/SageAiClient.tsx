'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport, isReasoningUIPart, isToolUIPart } from 'ai';
import {
  isDashboardPayload,
  isMapPayload,
} from '@/lib/sage-ai/ui-parts';
import { CanvasDashboard } from './CanvasDashboard';
import { SageAiMap } from './SageAiMap';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import {
  Send,
  Download,
  FileSpreadsheet,
  Loader2,
  Database,
  AlertCircle,
  Trash2,
  History,
  Plus,
  X,
  Bookmark,
  BookmarkPlus,
  Play,
  PanelLeftClose,
  PanelLeft,
  Tent,
  Copy,
  Check,
  Square,
  ArrowDown,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { CollapsibleMarkdownPre } from '@/lib/sage-ai/CollapsibleMarkdownPre';
import { FeedbackControls } from './FeedbackControls';
import { linkifyPastReportRefsInMarkdown } from '@/lib/sage-ai/linkify-past-report-refs';
import { downloadCsvFromData, downloadXlsxFromData, generateExportFilename } from '@/lib/sage-ai/csv-download';
import { PythonCodeBlock } from '@/lib/sage-ai/pyodide/PythonCodeBlock';
import { isPyodideEnvironmentError } from '@/lib/sage-ai/pyodide/is-pyodide-environment-error';
import {
  useAnyPythonBlockRunActive,
  abortAllPythonBlockRuns,
} from '@/lib/sage-ai/pyodide/python-execution-bridge';
import {
  SAGE_AI_CHAT_DEFAULT_MODEL,
  resolveSageAiGatewayModelId,
  type SageAiModelSelection,
} from '@/lib/sage-ai/sage-ai-chat-models';
import {
  SageAiModelPicker,
  sageAiSelectionFromStorage,
  sageAiSelectionToStorage,
  SAGE_AI_MODEL_STORAGE_KEY,
  SAGE_AI_PREMIUM_MODELS_STORAGE_KEY,
  SAGE_AI_WEB_RESEARCH_UI_ENABLED,
} from './SageAiModelPicker';

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  use_count: number;
  created_at: string;
}

/**
 * Whitelist of HTML tags / attributes the assistant is allowed to render via
 * `<ReactMarkdown>`. We start from `defaultSchema` (which already strips
 * scripts/iframes/event handlers) and add the few attributes our markdown
 * relies on — `className` for prose styling, `target/rel` so our custom `a`
 * component can produce an external-link affordance.
 *
 * Why this matters: assistant output is partly model-generated and partly
 * scraped (UNTRUSTED_CONTENT) — without sanitization, a model that decides
 * to emit raw `<img onerror>` or `<script>` would execute in the admin UI.
 */
const SAGE_AI_MARKDOWN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'target',
      'rel',
    ],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
    table: [...(defaultSchema.attributes?.table ?? []), 'className'],
    th: [...(defaultSchema.attributes?.th ?? []), 'className'],
    td: [...(defaultSchema.attributes?.td ?? []), 'className'],
  },
};

function formatSessionDate(dateStr: string, t: ReturnType<typeof useTranslations>): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return t('thisWeek');
  return t('older');
}

type SidebarTab = 'history' | 'saved';

function userMessagePlainText(message: UIMessage): string {
  const textParts = message.parts.filter((p) => p.type === 'text') as Array<{ type: 'text'; text: string }>;
  return textParts.map((p) => p.text).join('\n').trim();
}

/** Top edge of `el` in scroll-root content coordinates. */
function userMessageTopInScrollRoot(messageEl: HTMLElement, scrollRoot: HTMLElement): number {
  const rootRect = scrollRoot.getBoundingClientRect();
  const elRect = messageEl.getBoundingClientRect();
  return scrollRoot.scrollTop + (elRect.top - rootRect.top);
}

export default function SageAiClient() {
  const t = useTranslations('admin.sageAi');
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  /**
   * Stable id for `useChat` / transport (must not be `undefined` in the options object — that
   * triggers Chat recreation every render). Separate from `currentSessionId` so the first
   * successful session save can update the DB id without remounting the chat and wiping messages.
   * Also: changing this id recreates the Chat client and clears messages — never sync it to
   * `currentSessionId` when loading history from the sidebar (`handleLoadSession`).
   */
  const [chatTransportId, setChatTransportId] = useState(() => crypto.randomUUID());
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [savedQueriesLoading, setSavedQueriesLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [queryToSave, setQueryToSave] = useState('');
  const [lastQueryData, setLastQueryData] = useState<Record<string, unknown>[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [pythonRetryCount, setPythonRetryCount] = useState(0);
  /** At most one LLM auto-fix message per session; incremented synchronously to avoid duplicate sends when multiple Python blocks fail in one render. */
  const pythonAutoFixSentRef = useRef(0);
  const [modelSelection, setModelSelection] = useState<SageAiModelSelection>({
    modelId: SAGE_AI_CHAT_DEFAULT_MODEL,
  });
  /** Tavily/Firecrawl; only sent to API when UI flag allows and server env permits. */
  const [webResearchEnabled, setWebResearchEnabled] = useState(false);
  const webResearchRef = useRef(false);
  webResearchRef.current = webResearchEnabled && SAGE_AI_WEB_RESEARCH_UI_ENABLED;
  /**
   * Whether the user has opted in to selecting higher-cost premium models
   * (Claude Opus 4.7, Sonnet 4.5). Persisted in localStorage so the choice
   * sticks across reloads. Server still validates the model id against the
   * allowlist in `parseSageAiChatModelId`, so this is purely a UI gate.
   */
  const [premiumModelsUnlocked, setPremiumModelsUnlocked] = useState(false);
  const [modelPrefsLoaded, setModelPrefsLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [savedQueriesError, setSavedQueriesError] = useState<string | null>(null);
  const [stickyUserPrompt, setStickyUserPrompt] = useState<string | null>(null);
  const [feedbackBySessionMessage, setFeedbackBySessionMessage] = useState<
    Record<string, { rating: 1 | -1 }>
  >({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userMessageRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const messagesRef = useRef<UIMessage[]>([]);
  const stickyScrollRafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Last `part.output` reference we stored into `lastQueryData`; prevents infinite re-renders during streaming. */
  const lastQueryDataSourceRef = useRef<unknown>(null);
  /** Refs mirroring scroll state so effects don't depend on it and re-fire during smooth scroll. */
  const userHasScrolledRef = useRef(false);
  const isAtBottomRef = useRef(true);
  /** `useChat` keeps the first `transport` forever; read latest model from this ref in prepareSend. */
  const modelSelectionRef = useRef<SageAiModelSelection>(modelSelection);
  modelSelectionRef.current = modelSelection;

  const handleCopyText = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const extractUserText = useCallback((message: UIMessage): string => {
    if (!message.parts) return '';
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n');
  }, []);

  const beginEditMessage = useCallback(
    (messageId: string) => {
      const msg = messagesRef.current.find((m) => m.id === messageId);
      if (!msg || msg.role !== 'user') return;
      setEditingMessageId(messageId);
      setEditingDraft(extractUserText(msg));
    },
    [extractUserText]
  );

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setEditingDraft('');
  }, []);


  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/admin/sage-ai/chat',
        prepareSendMessagesRequest: ({
          id,
          messages,
          body,
          trigger,
          messageId,
        }) => ({
          body: {
            ...(body ?? {}),
            id,
            messages,
            trigger,
            messageId,
            model: resolveSageAiGatewayModelId(modelSelectionRef.current),
            webResearch: webResearchRef.current,
          },
        }),
        prepareReconnectToStreamRequest: ({ id, api }) => ({
          api: `${api}/${encodeURIComponent(id)}/resume`,
        }),
      }),
    []
  );

  const showToastRef = useRef<(msg: string) => void>(() => {});
  const { messages, sendMessage, status, setMessages, stop, resumeStream } = useChat({
    id: chatTransportId,
    transport,
    onError: (err) => {
      showToastRef.current(err.message ?? t('toastChatRequestFailed'));
    },
  });

  // When a session is loaded/selected, probe the resume endpoint so a still-
  // in-flight stream will reattach automatically after a reload. No-ops when
  // the server returns 204 (nothing to resume).
  useEffect(() => {
    resumeStream().catch((err) => {
      console.debug('[sage-ai] resumeStream noop', err);
    });
  }, [chatTransportId, resumeStream]);

  messagesRef.current = messages;

  const isLoading = status === 'streaming' || status === 'submitted';
  const anyPythonBlockRunActive = useAnyPythonBlockRunActive();
  /** Stops the LLM stream and/or in-browser Python so the user is never “stuck” with only the send button. */
  const showComposerStop = isLoading || anyPythonBlockRunActive;

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg: string) => setToastMessage(msg), []);
  showToastRef.current = showToast;

  /** Stable ref for `PythonCodeBlock` so `handleRun` is not re-created on every parent render. */
  const getInjectedQueryData = useCallback((): Record<string, unknown>[] | null => {
    return lastQueryData;
  }, [lastQueryData]);

  const handlePythonError = useCallback(
    (error: string, code: string) => {
      if (isPyodideEnvironmentError(error)) {
        showToast(t('pyodideEnvironmentToast'));
        return;
      }
      if (pythonAutoFixSentRef.current >= 1) return;
      pythonAutoFixSentRef.current += 1;
      setPythonRetryCount(pythonAutoFixSentRef.current);
      sendMessage({
        text: `The Python code failed with this error:\n\n\`\`\`\n${error}\n\`\`\`\n\nOriginal code:\n\`\`\`python\n${code}\n\`\`\`\n\nPlease analyze the error and generate fixed Python code that will work correctly.`,
      });
    },
    [sendMessage, showToast, t]
  );

  const submitEditMessage = useCallback(() => {
    const messageId = editingMessageId;
    if (!messageId) return;
    const draft = editingDraft.trim();
    if (!draft) return;
    const idx = messagesRef.current.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      setEditingMessageId(null);
      setEditingDraft('');
      return;
    }
    // Truncate history up to (but not including) the edited message, then
    // resend the new text as a fresh user turn. This is the standard
    // "rewind + branch" flow for chat UIs.
    setMessages(messagesRef.current.slice(0, idx));
    setEditingMessageId(null);
    setEditingDraft('');
    sendMessage({ text: draft });
  }, [editingDraft, editingMessageId, sendMessage, setMessages]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await fetch('/api/admin/sage-ai/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      } else {
        setSessionsError('Failed to load chat history');
      }
    } catch {
      setSessionsError('Failed to load chat history');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadSavedQueries = useCallback(async () => {
    setSavedQueriesLoading(true);
    setSavedQueriesError(null);
    try {
      const res = await fetch('/api/admin/sage-ai/saved-queries');
      if (res.ok) {
        const data = await res.json();
        setSavedQueries(data.queries ?? []);
      } else {
        setSavedQueriesError('Failed to load saved queries');
      }
    } catch {
      setSavedQueriesError('Failed to load saved queries');
    } finally {
      setSavedQueriesLoading(false);
    }
  }, []);

  const saveSession = useCallback(async (msgs: UIMessage[], sessionId: string | null) => {
    if (msgs.length === 0) return;

    try {
      const res = await fetch('/api/admin/sage-ai/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, messages: msgs }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!sessionId && data.id) {
          setCurrentSessionId(data.id);
        }
        loadSessions();
      } else {
        showToast(t('toastFailedSaveSession'));
      }
    } catch {
      showToast(t('toastFailedSaveSession'));
    }
  }, [loadSessions, showToast, t]);

  const handleSaveQuery = async () => {
    if (!saveQueryName.trim() || !queryToSave.trim()) return;

    try {
      const res = await fetch('/api/admin/sage-ai/saved-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveQueryName, query: queryToSave }),
      });
      if (res.ok) {
        loadSavedQueries();
        setShowSaveDialog(false);
        setSaveQueryName('');
        setQueryToSave('');
        showToast(t('toastQuerySaved'));
      } else {
        showToast(t('toastFailedSaveQuery'));
      }
    } catch {
      showToast(t('toastFailedSaveQuery'));
    }
  };

  const handleUseSavedQuery = async (query: SavedQuery) => {
    setInput(query.query);
    setShowSidebar(false);
    inputRef.current?.focus();

    try {
      await fetch(`/api/admin/sage-ai/saved-queries/${query.id}`, {
        method: 'POST',
      });
      loadSavedQueries();
    } catch {
      // Non-critical: silently fail use-count increment
    }
  };

  const handleDeleteSavedQuery = async (queryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const res = await fetch(`/api/admin/sage-ai/saved-queries/${queryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSavedQueries((prev) => prev.filter((q) => q.id !== queryId));
      } else {
        showToast(t('toastFailedDeleteQuery'));
      }
    } catch {
      showToast(t('toastFailedDeleteQuery'));
    }
  };

  const openSaveQueryDialog = (query: string) => {
    setQueryToSave(query);
    setSaveQueryName('');
    setShowSaveDialog(true);
  };

  useEffect(() => {
    if (messages.length > 0 && status === 'ready') {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveSession(messages, currentSessionIdRef.current);
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages, status, saveSession]);

  useEffect(() => {
    loadSessions();
    loadSavedQueries();
  }, [loadSessions, loadSavedQueries]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAGE_AI_MODEL_STORAGE_KEY);
      if (raw) {
        const parsed = sageAiSelectionFromStorage(JSON.parse(raw) as unknown);
        if (parsed) setModelSelection(parsed);
      }
    } catch {
      /* ignore */
    }
    try {
      const rawPremium = localStorage.getItem(SAGE_AI_PREMIUM_MODELS_STORAGE_KEY);
      if (rawPremium === 'true') setPremiumModelsUnlocked(true);
    } catch {
      /* ignore */
    }
    setModelPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!modelPrefsLoaded) return;
    try {
      localStorage.setItem(
        SAGE_AI_MODEL_STORAGE_KEY,
        JSON.stringify(sageAiSelectionToStorage(modelSelection))
      );
    } catch {
      /* ignore */
    }
  }, [modelSelection, modelPrefsLoaded]);

  useEffect(() => {
    if (!modelPrefsLoaded) return;
    try {
      localStorage.setItem(
        SAGE_AI_PREMIUM_MODELS_STORAGE_KEY,
        premiumModelsUnlocked ? 'true' : 'false'
      );
    } catch {
      /* ignore */
    }
  }, [premiumModelsUnlocked, modelPrefsLoaded]);

  const updateStickyUserPrompt = useCallback(() => {
    const container = messagesContainerRef.current;
    const list = messagesRef.current;
    if (!container || list.length === 0) {
      setStickyUserPrompt(null);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100;
    if (atBottom) {
      setStickyUserPrompt(null);
      return;
    }
    const band = 56;
    let prompt: string | null = null;
    for (const m of list) {
      if (m.role !== 'user') continue;
      const el = userMessageRowRefs.current.get(m.id);
      if (!el) continue;
      const y = userMessageTopInScrollRoot(el, container);
      if (y <= scrollTop + band) {
        const text = userMessagePlainText(m);
        if (text) prompt = text;
      }
    }
    setStickyUserPrompt(prompt);
  }, []);

  const scheduleStickyUserPromptUpdate = useCallback(() => {
    if (stickyScrollRafRef.current != null) return;
    stickyScrollRafRef.current = window.requestAnimationFrame(() => {
      stickyScrollRafRef.current = null;
      updateStickyUserPrompt();
    });
  }, [updateStickyUserPrompt]);

  useEffect(() => {
    return () => {
      if (stickyScrollRafRef.current != null) {
        window.cancelAnimationFrame(stickyScrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scheduleStickyUserPromptUpdate();
  }, [messages, scheduleStickyUserPromptUpdate]);

  // Handle scroll events to detect if user has scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100; // Within 100px of bottom

    if (atBottom !== isAtBottomRef.current) {
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    }
    if (!atBottom && isLoading && !userHasScrolledRef.current) {
      userHasScrolledRef.current = true;
      setUserHasScrolled(true);
    }
    if (atBottom && userHasScrolledRef.current) {
      userHasScrolledRef.current = false;
      setUserHasScrolled(false);
    }
    scheduleStickyUserPromptUpdate();
  }, [isLoading, scheduleStickyUserPromptUpdate]);

  // Auto-scroll only if user hasn't manually scrolled up. Depend on messages.length, not
  // the full messages array or scroll-state flags — those change during a smooth scroll and
  // would re-enter this effect, causing an infinite loop ("Maximum update depth exceeded").
  useEffect(() => {
    if (userHasScrolledRef.current || !isAtBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  // Stick to bottom while tokens stream in, without re-entering the effect on
  // every keystroke. `contentLen` updates as the assistant message grows.
  const contentLen = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return 0;
    return last.parts.reduce((acc, p) => {
      if (p.type === 'text') return acc + p.text.length;
      return acc;
    }, 0);
  }, [messages]);

  useEffect(() => {
    if (!isLoading) return;
    if (userHasScrolledRef.current || !isAtBottomRef.current) return;
    const raf = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [contentLen, isLoading]);

  // Reset scroll state when a new user message is appended.
  useEffect(() => {
    const list = messagesRef.current;
    if (list.length === 0) return;
    if (list[list.length - 1].role !== 'user') return;
    userHasScrolledRef.current = false;
    isAtBottomRef.current = true;
    setUserHasScrolled(false);
    setIsAtBottom(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    userHasScrolledRef.current = false;
    isAtBottomRef.current = true;
    setUserHasScrolled(false);
    setIsAtBottom(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Track the most recent tool-output dataset for Python injection. We guard updates with
  // a ref of the source `part.output` object so repeated renders during streaming (which
  // may produce new `messages` array references with the same underlying tool output) do
  // not set new array references into state each render and trigger an infinite loop.
  useEffect(() => {
    let latestSource: unknown = null;
    let latestData: Record<string, unknown>[] | null = null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== 'assistant') continue;
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (!isToolUIPart(part)) continue;
        if (part.state !== 'output-available') continue;
        const output = part.output;
        if (!output || typeof output !== 'object') continue;
        const outputObj = output as Record<string, unknown>;
        if ('data' in outputObj && Array.isArray(outputObj.data) && outputObj.data.length > 0) {
          latestSource = output;
          latestData = outputObj.data as Record<string, unknown>[];
          break;
        }
        if (
          'aggregates' in outputObj &&
          Array.isArray(outputObj.aggregates) &&
          outputObj.aggregates.length > 0
        ) {
          latestSource = output;
          latestData = outputObj.aggregates as Record<string, unknown>[];
          break;
        }
      }
      if (latestSource !== null) break;
    }

    if (latestSource !== null && latestSource !== lastQueryDataSourceRef.current) {
      lastQueryDataSourceRef.current = latestSource;
      setLastQueryData(latestData);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || anyPythonBlockRunActive) return;
    sendMessage({ text: input });
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = useCallback(() => {
    abortAllPythonBlockRuns();
    setMessages([]);
    setCurrentSessionId(null);
    setChatTransportId(crypto.randomUUID());
    setShowSidebar(false);
    pythonAutoFixSentRef.current = 0;
    setPythonRetryCount(0);
    setFeedbackBySessionMessage({});
    // Drop stale DOM references when we wipe the list so the Map doesn't
    // grow unbounded across many session swaps in a long-lived tab.
    userMessageRowRefs.current.clear();
    setEditingMessageId(null);
    setEditingDraft('');
    setWebResearchEnabled(false);
    inputRef.current?.focus();
  }, [setMessages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
        return;
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape' && editingMessageId) {
        setEditingMessageId(null);
        setEditingDraft('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingMessageId, handleNewChat]);

  const handleLoadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/sage-ai/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        // Defense in depth: even though the API now backfills `id`, never trust
        // the server completely. useChat silently drops messages without an id
        // (React loses the key) and the UI falls back to the empty welcome
        // state — which was the bug that brought us here.
        const rawMessages = Array.isArray(data?.session?.messages)
          ? (data.session.messages as Array<Partial<UIMessage>>)
          : [];
        const hydratedMessages: UIMessage[] = rawMessages.map((m, idx) => ({
          ...(m as UIMessage),
          id:
            typeof m.id === 'string' && m.id.length > 0
              ? m.id
              : `${sessionId}-${idx}`,
          parts: Array.isArray(m.parts) ? m.parts : [],
        }));
        // IMPORTANT: Do NOT call `setChatTransportId(sessionId)` here.
        // `useChat` recreates its internal Chat instance whenever `id` changes
        // (@ai-sdk/react), which resets messages to []. That runs in the same
        // render as these updates, wiping the history we just loaded. Keep
        // `chatTransportId` stable (see comment on state above); `currentSessionId`
        // drives which row we persist to in `saveSession`.
        stop();
        abortAllPythonBlockRuns();
        setMessages(hydratedMessages);
        setCurrentSessionId(sessionId);
        setShowSidebar(false);
        pythonAutoFixSentRef.current = 0;
        setPythonRetryCount(0);
      } else {
        console.error('Failed to load session:', res.status, res.statusText);
        showToast(t('loadSessionError'));
      }
    } catch (e) {
      console.error('Failed to load session:', e);
      showToast(t('loadSessionError'));
    }

    try {
      const res = await fetch(
        `/api/admin/sage-ai/feedback?sessionId=${encodeURIComponent(sessionId)}`
      );
      if (res.ok) {
        const data: {
          feedback?: Array<{ message_id: string; rating: number }>;
        } = await res.json();
        const map: Record<string, { rating: 1 | -1 }> = {};
        for (const row of data.feedback ?? []) {
          if (row.rating === 1 || row.rating === -1) {
            map[row.message_id] = { rating: row.rating };
          }
        }
        setFeedbackBySessionMessage(map);
      }
    } catch (e) {
      console.error('Failed to load feedback:', e);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const res = await fetch(`/api/admin/sage-ai/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setMessages([]);
          setCurrentSessionId(null);
          setChatTransportId(crypto.randomUUID());
          pythonAutoFixSentRef.current = 0;
          setPythonRetryCount(0);
        }
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const handleClearAllHistory = useCallback(async () => {
    if (sessions.length === 0) return;
    if (!confirm(t('clearHistoryConfirm'))) return;

    try {
      const res = await fetch('/api/admin/sage-ai/sessions', { method: 'DELETE' });
      if (!res.ok) {
        showToast(t('toastClearHistoryFailed'));
        return;
      }
      setSessions([]);
      handleNewChat();
      showToast(t('toastHistoryCleared'));
    } catch (e) {
      console.error('Failed to clear history:', e);
      showToast(t('toastClearHistoryFailed'));
    }
  }, [sessions.length, t, showToast, handleNewChat]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const extractExportData = (data: unknown): Record<string, unknown>[] => {
    if (!data || typeof data !== 'object') return [];

    if ('data' in data && Array.isArray((data as { data: unknown }).data)) {
      return (data as { data: Record<string, unknown>[] }).data;
    }
    if ('aggregates' in data && Array.isArray((data as { aggregates: unknown }).aggregates)) {
      return (data as { aggregates: Record<string, unknown>[] }).aggregates;
    }
    if ('values' in data && Array.isArray((data as { values: unknown }).values)) {
      const values = (data as { values: unknown[]; column?: string }).values;
      const column = (data as { column?: string }).column ?? 'value';
      return values.map((v) => ({ [column]: v }));
    }
    return [];
  };

  const handleDownloadCsv = (data: unknown, toolName: string) => {
    const exportData = extractExportData(data);
    if (exportData.length > 0) {
      const filename = generateExportFilename(`sage-ai-${toolName}`);
      downloadCsvFromData(exportData, `${filename}.csv`);
    }
  };

  const handleDownloadXlsx = async (data: unknown, toolName: string) => {
    const exportData = extractExportData(data);
    if (exportData.length > 0) {
      try {
        const filename = generateExportFilename(`sage-ai-${toolName}`);
        await downloadXlsxFromData(exportData, `${filename}.xlsx`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('toastFailedExportXlsx'));
      }
    }
  };

  const hasExportableData = (output: unknown): boolean => {
    if (!output || typeof output !== 'object') return false;
    if ('data' in output && Array.isArray((output as { data: unknown }).data) && (output as { data: unknown[] }).data.length > 0) return true;
    if ('aggregates' in output && Array.isArray((output as { aggregates: unknown }).aggregates) && (output as { aggregates: unknown[] }).aggregates.length > 0) return true;
    if ('values' in output && Array.isArray((output as { values: unknown }).values) && (output as { values: unknown[] }).values.length > 0) return true;
    return false;
  };

  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    for (const session of sessions) {
      const group = formatSessionDate(session.updated_at, t);
      if (!groups[group]) groups[group] = [];
      groups[group].push(session);
    }
    return groups;
  }, [sessions, t]);

  const currentSessionTitle = sessions.find(s => s.id === currentSessionId)?.title;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setSidebarTab('history')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  sidebarTab === 'history'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <History className="w-3.5 h-3.5 inline mr-1" />
                {t('history')}
              </button>
              <button
                onClick={() => setSidebarTab('saved')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  sidebarTab === 'saved'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 inline mr-1" />
                {t('saved')}
              </button>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <PanelLeftClose className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {sidebarTab === 'history' && (
            <>
              <div className="p-2">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('newChat')}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  disabled={sessionsLoading || sessions.length === 0}
                  aria-label={t('clearAllHistoryAria')}
                  className="mt-2 w-full px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  {t('clearAllHistory')}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {sessionsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : sessionsError ? (
                  <div className="text-center py-8 px-2">
                    <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                    <p className="text-xs text-red-500 mb-2">{sessionsError}</p>
                    <button onClick={loadSessions} className="text-xs text-sage-600 hover:underline">
                      {t('retry')}
                    </button>
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">{t('noHistory')}</p>
                ) : (
                  Object.entries(groupedSessions).map(([group, groupSessions]) => (
                    <div key={group} className="mb-3">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
                        {group}
                      </p>
                      {groupSessions.map((session) => {
                        const isActive = currentSessionId === session.id;
                        return (
                          <div
                            key={session.id}
                            className={`group flex items-center rounded-md transition-colors ${
                              isActive
                                ? 'bg-white dark:bg-gray-800 shadow-sm'
                                : 'hover:bg-white dark:hover:bg-gray-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleLoadSession(session.id)}
                              aria-current={isActive ? 'true' : undefined}
                              className={`flex-1 min-w-0 text-left px-2 py-1.5 text-[13px] rounded-md focus:outline-none focus:ring-2 focus:ring-sage-500 ${
                                isActive
                                  ? 'text-gray-900 dark:text-gray-100'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              <span className="block truncate">{session.title}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              aria-label={t('deleteSessionAria', { title: session.title })}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 mr-1 hover:text-red-500 transition-opacity rounded focus:outline-none focus:ring-2 focus:ring-sage-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {sidebarTab === 'saved' && (
            <div className="flex-1 overflow-y-auto p-2">
              {savedQueriesLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : savedQueriesError ? (
                <div className="text-center py-8 px-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                  <p className="text-xs text-red-500 mb-2">{savedQueriesError}</p>
                  <button onClick={loadSavedQueries} className="text-xs text-sage-600 hover:underline">
                    {t('retry')}
                  </button>
                </div>
              ) : savedQueries.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">{t('noSavedQueries')}</p>
              ) : (
                savedQueries.map((query) => (
                  <div
                    key={query.id}
                    className="group flex items-start rounded-md hover:bg-white dark:hover:bg-gray-800 transition-colors mb-1"
                  >
                    <button
                      type="button"
                      onClick={() => handleUseSavedQuery(query)}
                      className="flex-1 min-w-0 text-left px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-sage-500"
                    >
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate text-[13px] flex-1 min-w-0">
                          {query.name}
                        </span>
                        <Play className="w-3 h-3 text-sage-600 opacity-0 group-hover:opacity-100 shrink-0" aria-hidden="true" />
                      </span>
                      <span className="block text-xs text-gray-500 truncate mt-0.5">
                        {query.query}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedQuery(query.id, e)}
                      aria-label={t('deleteSavedQueryAria', { name: query.name })}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 mr-1 mt-2 hover:text-red-500 rounded focus:outline-none focus:ring-2 focus:ring-sage-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        className="max-w-[400px]"
      >
        <ModalContent className="p-5">
          <h2
            id="save-query-dialog-title"
            className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4"
          >
            {t('saveQuery')}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (saveQueryName.trim()) void handleSaveQuery();
            }}
          >
            <div className="mb-4">
              <label
                htmlFor="save-query-name"
                className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5"
              >
                {t('saveQueryName')}
              </label>
              <input
                id="save-query-name"
                type="text"
                value={saveQueryName}
                onChange={(e) => setSaveQueryName(e.target.value)}
                placeholder={t('saveQueryPlaceholder')}
                aria-describedby="save-query-preview"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent focus:outline-none"
                autoFocus
                maxLength={200}
              />
            </div>
            <p
              id="save-query-preview"
              className="text-sm text-gray-500 dark:text-gray-400 mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-xs whitespace-pre-wrap break-words"
            >
              {queryToSave}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {t('saveQueryCancel')}
              </button>
              <button
                type="submit"
                disabled={!saveQueryName.trim()}
                className="px-4 py-2 text-sm font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('saveQueryConfirm')}
              </button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      {/* Main Chat Area — overflow-visible so model picker popover can extend above the composer */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <PanelLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">Sage Outdoor Advisory</span>
              {currentSessionTitle && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">/</span>
                  <span>{currentSessionTitle}</span>
                </>
              )}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          )}
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto"
        >
          {stickyUserPrompt ? (
            <div className="sticky top-0 z-20 border-b border-gray-200/90 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-800/90 dark:bg-gray-950/95">
              <div className="mx-auto max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('stickyUserPromptLabel')}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {stickyUserPrompt}
                </p>
              </div>
            </div>
          ) : null}
          {/* Scroll to bottom button */}
          {userHasScrolled && isLoading && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-36 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <ArrowDown className="w-4 h-4" />
              <span className="text-sm font-medium">{t('scrollToBottom')}</span>
            </button>
          )}
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-sage-100 to-sage-200 dark:from-sage-900 dark:to-sage-800 mb-4">
                  <Tent className="w-6 h-6 text-sage-600 dark:text-sage-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('emptyStateTitle')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-[15px] leading-relaxed mb-8">
                  {t('emptyStateHint')}
                </p>
                
                {/* Quick Start Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <button
                    onClick={() => sendMessage({ text: t('quickStartRatePrompt') })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">📊</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartRateTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartRateDesc')}
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendMessage({ text: t('quickStartRvPrompt') })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">🎯</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartRvTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartRvDesc')}
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendMessage({ text: t('quickStartUnitPrompt') })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">🏕️</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartUnitTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartUnitDesc')}
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendMessage({ text: t('quickStartParksPrompt') })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">🗺️</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartParksTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartParksDesc')}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => sendMessage({ text: t('quickStartTexasReportsPrompt') })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">📋</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartTexasReportsTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartTexasReportsDesc')}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => sendMessage({ text: t('quickStartUsaTrendsPrompt') })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">📈</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartUsaTrendsTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartUsaTrendsDesc')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="mb-6">
                {message.role === 'user' ? (
                  <div
                    ref={(el) => {
                      if (el) userMessageRowRefs.current.set(message.id, el);
                      else userMessageRowRefs.current.delete(message.id);
                    }}
                    className="group relative"
                  >
                    <div className="rounded-2xl border border-gray-200/90 bg-gray-100 px-4 py-3 shadow-sm dark:border-gray-700/90 dark:bg-gray-800/95">
                      {editingMessageId === message.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editingDraft}
                            onChange={(e) => setEditingDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                submitEditMessage();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditMessage();
                              }
                            }}
                            autoFocus
                            rows={Math.min(8, Math.max(2, editingDraft.split('\n').length))}
                            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-[15px] text-gray-900 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                            disabled={isLoading}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditMessage}
                              className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                              disabled={isLoading}
                            >
                              {t('cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={submitEditMessage}
                              disabled={!editingDraft.trim() || isLoading}
                              className="px-3 py-1.5 text-sm rounded-md bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-40"
                            >
                              {t('editResend')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[15px] leading-relaxed text-gray-900 dark:text-gray-100">
                          {message.parts.map((part, partIndex) => {
                            if (part.type === 'text') {
                              return (
                                <div key={partIndex} className="whitespace-pre-wrap">
                                  {part.text}
                                  <span className="ml-2 inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => beginEditMessage(message.id)}
                                      title={t('editMessage')}
                                      disabled={isLoading}
                                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
                                    >
                                      <Pencil className="h-4 w-4 text-gray-500 hover:text-sage-600 dark:text-gray-400" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openSaveQueryDialog(part.text)}
                                      title={t('saveQuery')}
                                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                      <BookmarkPlus className="h-4 w-4 text-gray-500 hover:text-sage-600 dark:text-gray-400" />
                                    </button>
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed group/response">
                    {(() => {
                      // Tools that have their own custom renderer (CanvasDashboard,
                      // SageAiMap, clarifying-question card, etc.) render inline as
                      // before. Every other tool falls through to the generic
                      // "data tile" — and a single research turn often emits 3-5
                      // of those in a row (count + a few aggregations). To keep
                      // the chat scannable we collapse runs of ≥ 2 consecutive
                      // generic data tiles into one `<details>` group.
                      const CUSTOM_RENDERED_TOOL_NAMES = new Set([
                        'clarifying_question',
                        'suggest_followups',
                        'generate_dashboard',
                        'visualize_on_map',
                        'competitor_comparison',
                        'build_feasibility_brief',
                        'generate_python_code',
                      ]);
                      const isEmptyRetryOutput = (output: unknown): boolean =>
                        typeof output === 'object' &&
                        output !== null &&
                        '_emptyRetry' in output &&
                        (output as { _emptyRetry: unknown })._emptyRetry === true;
                      const isBundleableDataTool = (
                        part: typeof message.parts[number]
                      ): boolean => {
                        if (!isToolUIPart(part)) return false;
                        const name =
                          'toolName' in part
                            ? (part as { toolName: string }).toolName
                            : part.type.replace(/^tool-/, '');
                        if (CUSTOM_RENDERED_TOOL_NAMES.has(name)) return false;
                        if (
                          part.state === 'output-available' &&
                          isEmptyRetryOutput(part.output)
                        ) {
                          return false;
                        }
                        return true;
                      };
                      const skipIndexes = new Set<number>();
                      const bundleStarts = new Map<number, number[]>();
                      let activeBundle: number[] | null = null;
                      for (let i = 0; i < message.parts.length; i++) {
                        if (isBundleableDataTool(message.parts[i])) {
                          if (!activeBundle) {
                            activeBundle = [i];
                            bundleStarts.set(i, activeBundle);
                          } else {
                            activeBundle.push(i);
                            skipIndexes.add(i);
                          }
                        } else {
                          activeBundle = null;
                        }
                      }
                      const renderDefaultDataTile = (
                        innerPart: typeof message.parts[number],
                        innerIndex: number
                      ) => {
                        if (!isToolUIPart(innerPart)) return null;
                        const innerToolName =
                          'toolName' in innerPart
                            ? (innerPart as { toolName: string }).toolName
                            : innerPart.type.replace(/^tool-/, '');
                        const innerOutput =
                          innerPart.state === 'output-available'
                            ? innerPart.output
                            : undefined;
                        return (
                          <div
                            key={innerIndex}
                            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                          >
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                              <Database className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {innerToolName.replace(/_/g, ' ')}
                              </span>
                              {innerPart.state === 'input-streaming' && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              )}
                              {innerPart.state === 'input-available' && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">{t('toolRunning')}</span>
                              )}
                              {innerPart.state === 'output-available' && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                              )}
                            </div>
                            {innerPart.state === 'output-available' && innerOutput != null && (
                              <div className="px-3 py-2">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {typeof innerOutput === 'object' && innerOutput !== null && 'error' in innerOutput ? (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                      <AlertCircle className="w-4 h-4" />
                                      <span>{String((innerOutput as { error: string }).error)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div>
                                        {typeof innerOutput === 'object' && 'total_count' in (innerOutput as object) && (
                                          <span>
                                            {t('toolFoundResults', { total: (innerOutput as { total_count: number }).total_count })}
                                            {typeof innerOutput === 'object' && 'returned_count' in (innerOutput as object) &&
                                              ` · ${t('toolShowingResults', { count: (innerOutput as { returned_count: number }).returned_count })}`}
                                          </span>
                                        )}
                                        {typeof innerOutput === 'object' && 'count' in (innerOutput as object) && !('total_count' in (innerOutput as object)) && (() => {
                                          const co = innerOutput as {
                                            count: number;
                                            scope?: 'whole_table' | 'filtered';
                                            filters?: Record<string, string>;
                                            table?: string;
                                          };
                                          const filterEntries = co.filters
                                            ? Object.entries(co.filters)
                                            : [];
                                          const scopeText =
                                            co.scope === 'whole_table'
                                              ? t('toolCountUnfiltered')
                                              : filterEntries.length > 0
                                                ? t('toolCountFiltered', {
                                                    filters: filterEntries
                                                      .map(([k, v]) => `${k}=${v}`)
                                                      .join(', '),
                                                  })
                                                : null;
                                          return (
                                            <span>
                                              {t('toolCount', { count: co.count })}
                                              {scopeText && (
                                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                                  {scopeText}
                                                </span>
                                              )}
                                            </span>
                                          );
                                        })()}
                                        {typeof innerOutput === 'object' && 'total_groups' in (innerOutput as object) && (
                                          <span>{t('toolGroups', { count: (innerOutput as { total_groups: number }).total_groups })}</span>
                                        )}
                                      </div>
                                      {hasExportableData(innerOutput) && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleDownloadCsv(innerOutput, innerToolName)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                          >
                                            <Download className="w-3 h-3" />
                                            CSV
                                          </button>
                                          <button
                                            onClick={() => void handleDownloadXlsx(innerOutput, innerToolName)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                          >
                                            <FileSpreadsheet className="w-3 h-3" />
                                            Excel
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      };
                      return message.parts.map((part, partIndex) => {
                      if (skipIndexes.has(partIndex)) return null;
                      if (isReasoningUIPart(part)) {
                        return (
                          <details
                            key={partIndex}
                            open={part.state !== 'done'}
                            className="my-3 rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/50"
                          >
                            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                              {t('thinking')}
                            </summary>
                            <div className="border-t border-gray-200 px-3 py-2 text-xs leading-relaxed text-gray-700 dark:border-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                              {part.text}
                            </div>
                          </details>
                        );
                      }

                      if (part.type === 'text') {
                        const copyId = `${message.id}-${partIndex}`;
                        return (
                          <div key={partIndex} className="relative">
                            <button
                              onClick={() => handleCopyText(part.text, copyId)}
                              className="absolute -right-2 top-0 p-1.5 rounded-md opacity-0 group-hover/response:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                              title="Copy to clipboard"
                            >
                              {copiedId === copyId ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                              )}
                            </button>
                            <div
                              className="prose prose-gray dark:prose-invert max-w-none 
                                prose-p:my-2.5 prose-p:leading-relaxed
                                prose-ul:my-3 prose-ul:pl-0 prose-ul:list-none
                                prose-ol:my-3 prose-ol:pl-5
                                prose-li:my-1.5 prose-li:leading-relaxed
                                prose-headings:my-4 prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                                prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-700
                                prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                                prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                                prose-code:text-[13px] prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                                prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                                prose-a:text-sage-600 prose-a:no-underline hover:prose-a:underline
                                prose-table:w-full prose-table:border-collapse prose-table:text-sm prose-table:my-4
                                prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                                prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2
                                dark:prose-th:border-gray-700 dark:prose-th:bg-gray-800 dark:prose-td:border-gray-700
                                prose-hr:my-6 prose-hr:border-gray-200 dark:prose-hr:border-gray-700
                                prose-blockquote:border-l-4 prose-blockquote:border-sage-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400"
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[[rehypeSanitize, SAGE_AI_MARKDOWN_SANITIZE_SCHEMA]]}
                                components={{
                                  pre: CollapsibleMarkdownPre,
                                  a: ({ href, children, ...props }) => {
                                    const openNew =
                                      typeof href === 'string' &&
                                      (href.startsWith('/admin') ||
                                        href.startsWith('/api/') ||
                                        href.startsWith('http'));
                                    return (
                                      <a
                                        href={href}
                                        {...props}
                                        target={openNew ? '_blank' : undefined}
                                        rel={openNew ? 'noopener noreferrer' : undefined}
                                      >
                                        {children}
                                      </a>
                                    );
                                  },
                                  ul: ({ children }) => (
                                    <ul className="space-y-1.5">{children}</ul>
                                  ),
                                  li: ({ children }) => (
                                    <li className="flex items-start gap-2">
                                      <span className="text-sage-500 mt-1.5 text-xs">●</span>
                                      <span className="flex-1">{children}</span>
                                    </li>
                                  ),
                                }}
                              >
                                {linkifyPastReportRefsInMarkdown(part.text)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      }

                      if (isToolUIPart(part)) {
                        const toolName = 'toolName' in part 
                          ? (part as { toolName: string }).toolName 
                          : part.type.replace(/^tool-/, '');
                        const toolOutput = part.state === 'output-available' ? part.output : undefined;

                        // Hide intermediate empty-result tiles. The tool layer
                        // returns `{ _emptyRetry: true }` when a query yielded
                        // 0 rows but we want the model to retry with different
                        // params — rendering that tile is just noise. The
                        // model will produce a follow-up tool call (or, after
                        // burning the retry budget, a `_emptyRetryExhausted`
                        // payload that flows through the existing error path).
                        if (
                          part.state === 'output-available' &&
                          typeof toolOutput === 'object' &&
                          toolOutput !== null &&
                          '_emptyRetry' in toolOutput &&
                          (toolOutput as { _emptyRetry: unknown })._emptyRetry === true
                        ) {
                          return null;
                        }

                        // Render `clarifying_question` as a question card with
                        // clickable answer pills. Clicking an option sends that
                        // exact text back as the next user message — saves the
                        // user from typing the answer.
                        if (toolName === 'clarifying_question') {
                          if (part.state !== 'output-available') return null;
                          const cqOutput = toolOutput as
                            | { type?: string; question?: unknown; options?: unknown }
                            | undefined;
                          const question =
                            typeof cqOutput?.question === 'string'
                              ? cqOutput.question.trim()
                              : '';
                          const options = Array.isArray(cqOutput?.options)
                            ? (cqOutput.options as unknown[]).filter(
                                (o): o is string => typeof o === 'string' && o.trim().length > 0
                              )
                            : [];
                          if (!question || options.length === 0) return null;
                          return (
                            <div
                              key={partIndex}
                              className="my-3 rounded-lg border border-sage-200 bg-sage-50/60 px-4 py-3 dark:border-sage-800 dark:bg-sage-900/20"
                              role="group"
                              aria-label={t('clarifyingQuestionAria')}
                            >
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                {question}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {options.map((option, i) => (
                                  <button
                                    key={`${partIndex}-${i}`}
                                    type="button"
                                    onClick={() => sendMessage({ text: option })}
                                    className="rounded-full border border-sage-400 bg-white px-3 py-1.5 text-sm font-medium text-sage-800 hover:bg-sage-100 hover:border-sage-500 dark:border-sage-600 dark:bg-sage-900/60 dark:text-sage-100 dark:hover:bg-sage-900/80 transition-colors"
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // Render `suggest_followups` as a chip row, not a tool card.
                        if (toolName === 'suggest_followups') {
                          if (part.state !== 'output-available') return null;
                          const followupOutput = toolOutput as
                            | { type?: string; suggestions?: unknown }
                            | undefined;
                          const suggestions = Array.isArray(followupOutput?.suggestions)
                            ? (followupOutput.suggestions as unknown[]).filter(
                                (s): s is string => typeof s === 'string' && s.trim().length > 0
                              )
                            : [];
                          if (suggestions.length === 0) return null;
                          return (
                            <div
                              key={partIndex}
                              className="my-3 flex flex-wrap gap-2"
                              aria-label="Follow-up suggestions"
                            >
                              {suggestions.map((suggestion, i) => (
                                <button
                                  key={`${partIndex}-${i}`}
                                  type="button"
                                  onClick={() => sendMessage({ text: suggestion })}
                                  className="rounded-full border border-sage-300 bg-sage-50 px-3 py-1.5 text-sm text-sage-700 hover:bg-sage-100 hover:border-sage-400 dark:border-sage-700 dark:bg-sage-900/40 dark:text-sage-200 dark:hover:bg-sage-900/60 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          );
                        }

                        // Custom success renderer for generate_dashboard:
                        // pass the payload to the Recharts canvas.
                        if (
                          toolName === 'generate_dashboard' &&
                          part.state === 'output-available' &&
                          isDashboardPayload(toolOutput)
                        ) {
                          return (
                            <CanvasDashboard
                              key={partIndex}
                              payload={toolOutput}
                            />
                          );
                        }

                        // Custom success renderer for visualize_on_map:
                        // hand off GeoJSON to the Leaflet map.
                        if (
                          toolName === 'visualize_on_map' &&
                          part.state === 'output-available' &&
                          isMapPayload(toolOutput)
                        ) {
                          return (
                            <SageAiMap key={partIndex} payload={toolOutput} />
                          );
                        }

                        // Custom success renderer for competitor_comparison:
                        // show a compact summary; the model synthesizes the
                        // narrative from the tool payload in its follow-up text.
                        if (
                          toolName === 'competitor_comparison' &&
                          part.state === 'output-available' &&
                          typeof toolOutput === 'object' &&
                          toolOutput !== null &&
                          'type' in toolOutput &&
                          (toolOutput as { type: string }).type ===
                            'competitor_comparison'
                        ) {
                          const cmpOut = toolOutput as unknown as {
                            competitors: Array<{
                              name: string;
                              place?: { website: string | null } | null;
                              scrape?: { url: string } | null;
                              errors: string[];
                            }>;
                          };
                          const withPlace = cmpOut.competitors.filter(
                            (c) => c.place
                          ).length;
                          const withScrape = cmpOut.competitors.filter(
                            (c) => c.scrape
                          ).length;
                          return (
                            <div
                              key={partIndex}
                              className="my-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
                            >
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                Competitor comparison
                              </div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {cmpOut.competitors.length} competitors ·{' '}
                                {withPlace} with Google Places data ·{' '}
                                {withScrape} with scraped homepage
                              </div>
                            </div>
                          );
                        }

                        // Custom success renderer for build_feasibility_brief:
                        // show a link to the newly created draft report.
                        if (
                          toolName === 'build_feasibility_brief' &&
                          part.state === 'output-available' &&
                          typeof toolOutput === 'object' &&
                          toolOutput !== null &&
                          'type' in toolOutput &&
                          (toolOutput as { type: string }).type ===
                            'feasibility_brief_draft'
                        ) {
                          const briefOut = toolOutput as unknown as {
                            report_id: string;
                            template: string;
                            sections_written: number;
                            view_url: string;
                          };
                          return (
                            <div
                              key={partIndex}
                              className="my-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3"
                            >
                              <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                Draft feasibility brief created
                              </div>
                              <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                Template: {briefOut.template} ·{' '}
                                {briefOut.sections_written} section
                                {briefOut.sections_written === 1 ? '' : 's'} written
                              </div>
                              <a
                                href={briefOut.view_url}
                                className="mt-2 inline-flex items-center text-sm font-medium text-emerald-700 dark:text-emerald-200 hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open draft in reports →
                              </a>
                            </div>
                          );
                        }

                        // Inline `generate_python_code` tiles (chunky python
                        // editor + chart output) keep their own card so the user
                        // can run / inspect them without expanding a group.
                        if (
                          toolName === 'generate_python_code' &&
                          part.state === 'output-available' &&
                          typeof toolOutput === 'object' &&
                          toolOutput !== null &&
                          'type' in toolOutput &&
                          (toolOutput as { type: string }).type === 'python_code'
                        ) {
                          const pyOutput = toolOutput as unknown as {
                            code: string;
                            description: string;
                            uses_query_data?: boolean;
                          };
                          return (
                            <div
                              key={partIndex}
                              className="my-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                            >
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <Database className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {toolName.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                              </div>
                              <div className="px-3 py-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {pyOutput.description}
                                </p>
                                <PythonCodeBlock
                                  code={pyOutput.code}
                                  onDataInject={
                                    pyOutput.uses_query_data
                                      ? getInjectedQueryData
                                      : undefined
                                  }
                                  onError={handlePythonError}
                                  retryCount={pythonRetryCount}
                                />
                              </div>
                            </div>
                          );
                        }

                        // Generic data tile. If this index is the start of a
                        // ≥ 2 tile bundle, collapse the whole run behind a
                        // single `<details>` toggle; otherwise render solo.
                        const bundle = bundleStarts.get(partIndex);
                        if (bundle && bundle.length > 1) {
                          const allDone = bundle.every((i) => {
                            const bp = message.parts[i];
                            return (
                              isToolUIPart(bp) && bp.state === 'output-available'
                            );
                          });
                          return (
                            <details
                              key={partIndex}
                              className="my-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden group/bundle"
                            >
                              <summary className="cursor-pointer select-none flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Database className="w-4 h-4 text-gray-400" />
                                <span>{t('toolBundle', { count: bundle.length })}</span>
                                {allDone ? (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                                ) : (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                )}
                              </summary>
                              <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2 space-y-2">
                                {bundle.map((i) =>
                                  renderDefaultDataTile(message.parts[i], i)
                                )}
                              </div>
                            </details>
                          );
                        }

                        return (
                          <div key={partIndex} className="my-4">
                            {renderDefaultDataTile(part, partIndex)}
                          </div>
                        );
                      }

                      return null;
                      });
                    })()}
                    {message.role === 'assistant' &&
                      !isLoading &&
                      currentSessionId && (
                        <FeedbackControls
                          sessionId={currentSessionId}
                          messageId={message.id}
                          model={resolveSageAiGatewayModelId(modelSelection)}
                          initial={feedbackBySessionMessage[message.id]}
                          onChange={(next) => {
                            setFeedbackBySessionMessage((prev) => {
                              if (next === null) {
                                const { [message.id]: _removed, ...rest } = prev;
                                return rest;
                              }
                              return { ...prev, [message.id]: next };
                            });
                          }}
                          onError={showToast}
                        />
                      )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm text-gray-500">{t('thinking')}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="relative z-20 border-t border-gray-100 bg-white pb-[50px] dark:border-gray-800 dark:bg-gray-950">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSubmit}>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-visible">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t('inputPlaceholder')}
                  rows={1}
                  className="w-full resize-none rounded-t-xl border-0 bg-transparent px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  disabled={isLoading}
                />
                <div className="flex items-center gap-1 rounded-b-xl border-t border-gray-100 px-2 py-1.5 dark:border-gray-800">
                  <SageAiModelPicker
                    selection={modelSelection}
                    onSelectionChange={setModelSelection}
                    webResearchEnabled={webResearchEnabled}
                    onWebResearchChange={setWebResearchEnabled}
                    premiumModelsUnlocked={premiumModelsUnlocked}
                    onPremiumModelsUnlockedChange={setPremiumModelsUnlocked}
                    disabled={isLoading}
                  />
                  <div className="flex-1" />
                  {showComposerStop ? (
                    <button
                      type="button"
                      onClick={() => {
                        void stop();
                        abortAllPythonBlockRuns();
                      }}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 transition-colors hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300"
                      title={t('stopGenerating')}
                    >
                      <Square className="h-3 w-3 fill-current text-white dark:text-gray-900" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                      aria-label={t('inputPlaceholder')}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {toastMessage}
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

