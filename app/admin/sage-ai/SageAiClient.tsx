'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { useTranslations } from 'next-intl';
import {
  Send,
  AlertCircle,
  Plus,
  X,
  PanelLeft,
  Tent,
  Square,
  ArrowDown,
} from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { isPyodideEnvironmentError } from '@/lib/sage-ai/pyodide/is-pyodide-environment-error';
import {
  useAnyPythonBlockRunActive,
  abortAllPythonBlockRuns,
} from '@/lib/sage-ai/pyodide/python-execution-bridge';
import {
  SAGE_AI_DEFAULT_MODEL_SELECTION,
  resolveSageAiGatewayModelId,
  type SageAiModelSelection,
} from '@/lib/sage-ai/sage-ai-chat-models';
import { generateUniqueId } from '@/lib/random-id';
import {
  SageAiModelPicker,
  sageAiModelForChatRequest,
  sageAiSelectionFromStorage,
  sageAiSelectionToStorage,
  sageAiTriggerLabel,
  SAGE_AI_MODEL_STORAGE_KEY,
} from './SageAiModelPicker';
import { SageAiMessageRow } from './SageAiMessageRow';
import {
  SageAiSidebar,
  type SageAiPendingConfirm,
  type SidebarTab,
} from './SageAiSidebar';
import { useSageAiServerCapabilities } from './useSageAiServerCapabilities';
import { isSageAiTimeoutError } from '@/lib/sage-ai/chat-limits';
import { SageAiFieldGuidePanel } from './SageAiFieldGuidePanel';
import { SageAiConfirmDialog } from './SageAiConfirmDialog';
import { SageAiSessionTitleEditor } from './SageAiSessionTitleEditor';
import { SageAiThreadUsageBar } from './SageAiThreadUsageBar';
import { useSageAiSessions } from './useSageAiSessions';
import {
  SAGE_AI_SESSION_SEARCH_PARAM,
  sageAiPathWithSession,
} from '@/lib/sage-ai/session-url';
import {
  readAndConsumeSageAiMarketReportBootstrap,
  SAGE_AI_FROM_MARKET_REPORT_SEARCH_PARAM,
  SAGE_AI_FROM_MARKET_REPORT_SEARCH_VALUE,
} from '@/lib/sage-ai/market-report-bootstrap';
import { SAGE_AI_CLIENT_STREAM_RESUME_ENABLED } from '@/lib/sage-ai/server-capabilities';

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
  const tRef = useRef(t);
  tRef.current = t;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const marketReportBootstrapHandledRef = useRef(false);
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history');
  const [pendingConfirm, setPendingConfirm] = useState<SageAiPendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  /**
   * Stable id for `useChat` / transport (must not be `undefined` in the options object — that
   * triggers Chat recreation every render). Separate from `currentSessionId` so the first
   * successful session save can update the DB id without remounting the chat and wiping messages.
   * Also: changing this id recreates the Chat client and clears messages — never sync it to
   * `currentSessionId` when loading history from the sidebar (`handleLoadSession`).
   */
  const [chatTransportId, setChatTransportId] = useState(() => generateUniqueId());
  const [lastQueryData, setLastQueryData] = useState<Record<string, unknown>[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [pythonRetryCount, setPythonRetryCount] = useState(0);
  /** At most one LLM auto-fix message per session; incremented synchronously to avoid duplicate sends when multiple Python blocks fail in one render. */
  const pythonAutoFixSentRef = useRef(0);
  const [modelSelection, setModelSelection] = useState<SageAiModelSelection>(
    SAGE_AI_DEFAULT_MODEL_SELECTION
  );
  /** Tavily/Firecrawl; only sent to API when UI flag allows and server env permits. */
  const [webResearchEnabled, setWebResearchEnabled] = useState(false);
  const serverCapabilities = useSageAiServerCapabilities();
  const webResearchServerEnabled = serverCapabilities?.webResearchServer ?? false;
  const webResearchRef = useRef(false);
  webResearchRef.current = webResearchEnabled && webResearchServerEnabled;
  const [modelPrefsLoaded, setModelPrefsLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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
  /** Last `part.output` reference we stored into `lastQueryData`; used for debugging / future guards. */
  const lastQueryDataSourceRef = useRef<unknown>(null);
  /**
   * Stable key for the latest tabular tool payload. `part.output` is often a new object
   * reference on every `messages` update from the AI SDK — comparing it alone caused
   * `setLastQueryData` to run every render (Maximum update depth exceeded).
   */
  const lastQueryDataFingerprintRef = useRef<string | null>(null);
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

  const showToast = useCallback((msg: string) => setToastMessage(msg), []);

  const resetChatSurfaceRef = useRef<() => void>(() => {});
  const onSessionLoadedRef = useRef<(sessionId: string, messages: UIMessage[]) => void>(() => {});
  const stopChatRef = useRef<() => void>(() => {});

  const {
    sessions,
    sessionsLoading,
    sessionsError,
    loadSessions,
    currentSessionId,
    setCurrentSessionId,
    currentSessionIdRef,
    saveSession,
    saveTimeoutRef,
    handleLoadSession,
    deleteSession,
    clearAllHistory,
    groupedSessions,
    currentSessionTitle,
    savedQueries,
    savedQueriesLoading,
    savedQueriesError,
    loadSavedQueries,
    showSaveDialog,
    setShowSaveDialog,
    saveQueryName,
    setSaveQueryName,
    queryToSave,
    openSaveQueryDialog,
    handleSaveQuery,
    handleUseSavedQuery,
    deleteSavedQuery,
    updateSessionTitle,
  } = useSageAiSessions({
    showToast,
    onChatReset: () => resetChatSurfaceRef.current(),
    onSessionLoaded: (sessionId, hydratedMessages) =>
      onSessionLoadedRef.current(sessionId, hydratedMessages),
    onSessionFeedbackLoaded: setFeedbackBySessionMessage,
    stopActiveStream: () => stopChatRef.current(),
    focusInput: () => inputRef.current?.focus(),
    setSidebarOpen: setShowSidebar,
  });

  const sessionIdForChatRef = useRef<string | null>(null);
  sessionIdForChatRef.current = currentSessionId;

  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const deepLinkSessionHandledRef = useRef<string | null>(null);
  const prevChatStatusRef = useRef<string>('ready');
  const earlySessionSaveRef = useRef(false);

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
            model: sageAiModelForChatRequest(modelSelectionRef.current),
            webResearch: webResearchRef.current,
            sessionId: sessionIdForChatRef.current,
          },
        }),
        ...(SAGE_AI_CLIENT_STREAM_RESUME_ENABLED
          ? {
              prepareReconnectToStreamRequest: ({ id, api }: { id: string; api: string }) => ({
                api: `${api}/${encodeURIComponent(id)}/resume`,
              }),
            }
          : {}),
      }),
    []
  );

  const showToastRef = useRef<(msg: string) => void>(() => {});
  showToastRef.current = showToast;

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: chatTransportId,
    transport,
    onError: (err) => {
      const raw = err.message ?? '';
      const msg = isSageAiTimeoutError(raw)
        ? tRef.current('toastChatTimeout')
        : raw || tRef.current('toastChatRequestFailed');
      showToastRef.current(msg);
    },
  });
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  stopChatRef.current = stop;

  const resetChatSurface = useCallback(() => {
    abortAllPythonBlockRuns();
    setMessages([]);
    lastQueryDataSourceRef.current = null;
    lastQueryDataFingerprintRef.current = null;
    setLastQueryData(null);
    setChatTransportId(generateUniqueId());
    setShowSidebar(false);
    pythonAutoFixSentRef.current = 0;
    setPythonRetryCount(0);
    setFeedbackBySessionMessage({});
    userMessageRowRefs.current.clear();
    setEditingMessageId(null);
    setEditingDraft('');
    setWebResearchEnabled(false);
    earlySessionSaveRef.current = false;
    inputRef.current?.focus();
  }, [setMessages]);
  resetChatSurfaceRef.current = resetChatSurface;

  onSessionLoadedRef.current = (_sessionId, hydratedMessages) => {
    lastQueryDataSourceRef.current = null;
    lastQueryDataFingerprintRef.current = null;
    setLastQueryData(null);
    setMessages(hydratedMessages);
    pythonAutoFixSentRef.current = 0;
    setPythonRetryCount(0);
  };

  messagesRef.current = messages;

  const isLoading = status === 'streaming' || status === 'submitted';
  const anyPythonBlockRunActive = useAnyPythonBlockRunActive();
  /** Stops the LLM stream and/or in-browser Python so the user is never “stuck” with only the send button. */
  const showComposerStop = isLoading || anyPythonBlockRunActive;

  useEffect(() => {
    const wasBusy =
      prevChatStatusRef.current === 'streaming' ||
      prevChatStatusRef.current === 'submitted';
    prevChatStatusRef.current = status;
    if (wasBusy && status === 'ready' && currentSessionId) {
      setUsageRefreshKey((k) => k + 1);
    }
  }, [status, currentSessionId]);

  useEffect(() => {
    const linkedId = searchParams.get(SAGE_AI_SESSION_SEARCH_PARAM);
    if (!linkedId) {
      deepLinkSessionHandledRef.current = null;
      return;
    }
    if (currentSessionId === linkedId) {
      deepLinkSessionHandledRef.current = linkedId;
      return;
    }
    if (deepLinkSessionHandledRef.current === linkedId) return;
    deepLinkSessionHandledRef.current = linkedId;
    void handleLoadSession(linkedId);
  }, [searchParams, currentSessionId, handleLoadSession]);

  useEffect(() => {
    const path = pathname && pathname.startsWith('/') ? pathname : '/admin/sage-ai';
    const linkedId = searchParams.get(SAGE_AI_SESSION_SEARCH_PARAM);
    if (linkedId === currentSessionId || (!linkedId && !currentSessionId)) {
      return;
    }
    router.replace(sageAiPathWithSession(path, currentSessionId, searchParams.toString()), {
      scroll: false,
    });
  }, [currentSessionId, pathname, router, searchParams]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  /** Mirror of `lastQueryData`; lets the getter below stay referentially stable. */
  const lastQueryDataValueRef = useRef<Record<string, unknown>[] | null>(null);
  lastQueryDataValueRef.current = lastQueryData;
  /**
   * Stable getter for `PythonCodeBlock` (via memoized message rows): never
   * re-created, reads the latest dataset from the ref at run time.
   */
  const getInjectedQueryData = useCallback((): Record<string, unknown>[] | null => {
    return lastQueryDataValueRef.current;
  }, []);

  /** Stable: reads everything through refs so memoized rows never re-render because of it. */
  const handlePythonError = useCallback(
    (error: string, code: string) => {
      if (isPyodideEnvironmentError(error)) {
        showToastRef.current(tRef.current('pyodideEnvironmentToast'));
        return;
      }
      if (pythonAutoFixSentRef.current >= 1) return;
      pythonAutoFixSentRef.current += 1;
      setPythonRetryCount(pythonAutoFixSentRef.current);
      sendMessageRef.current({
        text: `The Python code failed with this error:\n\n\`\`\`\n${error}\n\`\`\`\n\nOriginal code:\n\`\`\`python\n${code}\n\`\`\`\n\nPlease analyze the error and generate fixed Python code that will work correctly.`,
      });
    },
    []
  );

  /** Mirror editing state into refs so `submitEditMessage` stays stable across edit keystrokes. */
  const editingMessageIdRef = useRef<string | null>(null);
  editingMessageIdRef.current = editingMessageId;
  const editingDraftRef = useRef('');
  editingDraftRef.current = editingDraft;

  const submitEditMessage = useCallback(() => {
    const messageId = editingMessageIdRef.current;
    if (!messageId) return;
    const draft = editingDraftRef.current.trim();
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
    sendMessageRef.current({ text: draft });
  }, [setMessages]);

  /** Stable send wrapper for memoized rows (clarifying-question / follow-up chips). */
  const handleSendMessageText = useCallback((text: string) => {
    sendMessageRef.current({ text });
  }, []);

  /** Stable per-message feedback updater for memoized rows. */
  const handleFeedbackChange = useCallback(
    (messageId: string, next: { rating: 1 | -1 } | null) => {
      setFeedbackBySessionMessage((prev) => {
        if (next === null) {
          const { [messageId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [messageId]: next };
      });
    },
    []
  );

  /** Stable ref registrar for user message rows (sticky-prompt scroll tracking). */
  const registerUserMessageEl = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) userMessageRowRefs.current.set(id, el);
      else userMessageRowRefs.current.delete(id);
    },
    []
  );

  useEffect(() => {
    if (!webResearchServerEnabled && webResearchEnabled) {
      setWebResearchEnabled(false);
    }
  }, [webResearchServerEnabled, webResearchEnabled]);

  // Debounced auto-save. Keyed on the `status` transition to 'ready' plus the
  // message count — NOT the full `messages` array, which gets a new identity on
  // every streaming token and used to re-run this effect (clear + re-arm the
  // debounce) hundreds of times per response. The saved payload is read from
  // `messagesRef` inside the timeout so it is always the latest snapshot.
  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveSession(messagesRef.current, currentSessionIdRef.current);
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages.length, status, saveSession, saveTimeoutRef, currentSessionIdRef]);

  /**
   * Persist session on first user turn so feedback works on the first assistant
   * reply. Keyed on `messages.length` + `status` (not the full array) so it
   * doesn't re-run per streaming token; `earlySessionSaveRef` already makes it
   * once-per-session.
   */
  useEffect(() => {
    if (currentSessionIdRef.current || earlySessionSaveRef.current) return;
    if (status !== 'submitted' && status !== 'streaming') return;
    const msgs = messagesRef.current;
    if (!msgs.some((m) => m.role === 'user')) return;
    earlySessionSaveRef.current = true;
    void saveSession(msgs, null);
  }, [messages.length, status, saveSession, currentSessionIdRef]);

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
    setStickyUserPrompt((prev) => (prev === prompt ? prev : prompt));
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

  // `contentLen` / part-count keys must be declared before the sticky `useEffect` below.
  const contentLen = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return 0;
    return last.parts.reduce((acc, p) => {
      if (p.type === 'text') return acc + p.text.length;
      return acc;
    }, 0);
  }, [messages]);

  /** Changes when a new part is appended to the last assistant message (e.g. a tool result). */
  const lastAssistantMessagePartsKey = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === 'assistant') {
        return messages[i]!.parts.length;
      }
    }
    return 0;
  }, [messages]);

  /**
   * Fingerprint of the last assistant message's tool parts: message id, part
   * count, and how many tool parts have reached `output-available`. Changes
   * when a tool result lands (including in-place `state` transitions that
   * don't change the part count) but NOT on every streamed text token — used
   * to gate the `lastQueryData` scan below.
   */
  const lastAssistantToolOutputKey = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      if (m.role !== 'assistant') continue;
      let outputCount = 0;
      for (const p of m.parts) {
        if (isToolUIPart(p) && p.state === 'output-available') outputCount += 1;
      }
      return `${m.id}:${m.parts.length}:${outputCount}`;
    }
    return '';
  }, [messages]);

  useEffect(() => {
    scheduleStickyUserPromptUpdate();
  }, [
    messages.length,
    contentLen,
    lastAssistantMessagePartsKey,
    scheduleStickyUserPromptUpdate,
  ]);

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

  // Track the most recent tool-output dataset for Python injection. Do **not** key off
  // `part.output` object identity: the AI SDK can replace that object on every
  // `messages` update, which re-fired this effect and called `setLastQueryData` every
  // render (Maximum update depth exceeded). We use a stable fingerprint instead.
  //
  // Re-keyed on `lastAssistantToolOutputKey` + `status` (instead of the full
  // `messages` array) so the full history scan runs only when a tool output
  // lands or streaming finishes — not on every streamed token. Message data is
  // read from `messagesRef` to keep the deps minimal.
  useEffect(() => {
    let latestSource: unknown = null;
    let latestData: Record<string, unknown>[] | null = null;
    let fingerprint: string | null = null;

    const scanMessages = messagesRef.current;
    for (let i = scanMessages.length - 1; i >= 0; i--) {
      const message = scanMessages[i];
      if (message.role !== 'assistant') continue;
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (!isToolUIPart(part)) continue;
        if (part.state !== 'output-available') continue;
        const output = part.output;
        if (!output || typeof output !== 'object') continue;
        const outputObj = output as Record<string, unknown>;
        const toolId =
          (part as { toolCallId?: string; toolName?: string }).toolCallId ??
          (part as { type?: string }).type ??
          '';
        if ('data' in outputObj && Array.isArray(outputObj.data) && outputObj.data.length > 0) {
          const data = outputObj.data as Record<string, unknown>[];
          const first = data[0] ?? {};
          const firstKey = String(
            (first as { id?: unknown; key?: unknown }).id ?? (first as { key?: unknown }).key ?? ''
          );
          fingerprint = `data:${message.id}:${j}:${toolId}:${data.length}:${firstKey}`;
          latestSource = output;
          latestData = data;
          break;
        }
        if (
          'aggregates' in outputObj &&
          Array.isArray(outputObj.aggregates) &&
          outputObj.aggregates.length > 0
        ) {
          const data = outputObj.aggregates as Record<string, unknown>[];
          const first = data[0] ?? {};
          const firstKey = String(
            (first as { id?: unknown; key?: unknown }).id ?? (first as { key?: unknown }).key ?? ''
          );
          fingerprint = `agg:${message.id}:${j}:${toolId}:${data.length}:${firstKey}`;
          latestSource = output;
          latestData = data;
          break;
        }
      }
      if (fingerprint != null) break;
    }

    if (fingerprint == null) return;
    if (fingerprint === lastQueryDataFingerprintRef.current) {
      if (latestSource != null) lastQueryDataSourceRef.current = latestSource;
      return;
    }
    lastQueryDataFingerprintRef.current = fingerprint;
    if (latestSource != null) lastQueryDataSourceRef.current = latestSource;
    if (latestData != null) setLastQueryData(latestData);
  }, [lastAssistantToolOutputKey, status, messages.length]);

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
    resetChatSurface();
    setCurrentSessionId(null);
  }, [resetChatSurface, setCurrentSessionId]);

  const runPendingConfirm = useCallback(async () => {
    if (!pendingConfirm) return;
    setConfirmBusy(true);
    try {
      if (pendingConfirm.kind === 'deleteSession') {
        await deleteSession(pendingConfirm.sessionId);
      } else if (pendingConfirm.kind === 'clearHistory') {
        await clearAllHistory();
      } else if (pendingConfirm.kind === 'deleteSavedQuery') {
        await deleteSavedQuery(pendingConfirm.queryId);
      }
      setPendingConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  }, [pendingConfirm, deleteSession, clearAllHistory, deleteSavedQuery]);

  useEffect(() => {
    if (marketReportBootstrapHandledRef.current) return;
    if (searchParams.get(SAGE_AI_FROM_MARKET_REPORT_SEARCH_PARAM) !== SAGE_AI_FROM_MARKET_REPORT_SEARCH_VALUE) {
      return;
    }
    marketReportBootstrapHandledRef.current = true;

    const payload = readAndConsumeSageAiMarketReportBootstrap();
    const path = pathname && pathname.startsWith('/') ? pathname : '/admin/sage-ai';
    router.replace(sageAiPathWithSession(path, null, searchParams.toString()));

    if (!payload) return;

    const envelope: Record<string, unknown> = {
      meta: payload.meta,
      sections: payload.sections,
      mapPins: payload.mapPins,
    };
    if (payload.mapPinsOmittedDueToSize) {
      envelope.mapPinsOmittedDueToSize = true;
    }
    const json = JSON.stringify(envelope, null, 2);
    const text = `${t('marketReportBootstrapPreamble')}\n\n\`\`\`json\n${json}\n\`\`\``;

    handleNewChat();

    window.setTimeout(() => {
      sendMessageRef.current({ text });
    }, 0);
  }, [handleNewChat, pathname, router, searchParams, t]);

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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  /** Resolved gateway model id sent with feedback; stable string so memoized rows don't re-render. */
  const feedbackModel = resolveSageAiGatewayModelId(modelSelection);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={() => setShowSidebar(false)}
        />
      )}
      {showSidebar && (
        <SageAiSidebar
          sidebarTab={sidebarTab}
          onTabChange={setSidebarTab}
          onClose={() => setShowSidebar(false)}
          currentSessionId={currentSessionId}
          currentSessionTitle={currentSessionTitle}
          onRenameSession={updateSessionTitle}
          showToast={showToast}
          onNewChat={handleNewChat}
          onRequestConfirm={setPendingConfirm}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          sessionsError={sessionsError}
          onRetrySessions={loadSessions}
          groupedSessions={groupedSessions}
          onLoadSession={handleLoadSession}
          savedQueries={savedQueries}
          savedQueriesLoading={savedQueriesLoading}
          savedQueriesError={savedQueriesError}
          onRetrySavedQueries={loadSavedQueries}
          onUseSavedQuery={(query) => handleUseSavedQuery(query, setInput)}
        />
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
                className="w-full px-3 py-2 text-sm border border-neutral-200/75 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent focus:outline-none"
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

      <SageAiConfirmDialog
        open={pendingConfirm !== null}
        title={
          pendingConfirm?.kind === 'clearHistory'
            ? t('clearHistoryConfirm')
            : pendingConfirm?.kind === 'deleteSavedQuery'
              ? t('deleteSavedQueryConfirm', { name: pendingConfirm.name })
              : t('deleteConfirm')
        }
        description={
          pendingConfirm?.kind === 'deleteSession' ? pendingConfirm.title : undefined
        }
        busy={confirmBusy}
        onClose={() => {
          if (!confirmBusy) setPendingConfirm(null);
        }}
        onConfirm={() => void runPendingConfirm()}
      />

      {/* Main Chat Area — overflow-visible so model picker popover can extend above the composer */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible bg-white dark:bg-neutral-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100/85 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <PanelLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <SageAiFieldGuidePanel setInput={setInput} inputRef={inputRef} />
            <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="shrink-0 font-medium text-gray-900 dark:text-gray-100">
                Sage Outdoor Advisory
              </span>
              {currentSessionId && currentSessionTitle ? (
                <>
                  <span className="shrink-0 text-gray-300 dark:text-gray-600">/</span>
                  <SageAiSessionTitleEditor
                    sessionId={currentSessionId}
                    title={currentSessionTitle}
                    onRenamed={(title) => updateSessionTitle(currentSessionId, title)}
                    showToast={showToast}
                    compact
                  />
                </>
              ) : null}
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
              className="fixed bottom-36 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/75 dark:border-neutral-800 rounded-full shadow-lg hover:bg-neutral-50/90 dark:hover:bg-neutral-800/55 transition-all"
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
                <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
                  <button
                    type="button"
                    onClick={() => sendMessage({ text: t('quickStartMarketReportPrompt') })}
                    className="rounded-lg border border-gray-200/80 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-sage-300 hover:bg-sage-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-sage-700 dark:hover:bg-sage-900/20"
                  >
                    {t('quickStartMarketReportTitle')}
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage({ text: t('quickStartMonthlyRatesPrompt') })}
                    className="rounded-lg border border-gray-200/80 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-sage-300 hover:bg-sage-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-sage-700 dark:hover:bg-sage-900/20"
                  >
                    {t('quickStartMonthlyRatesTitle')}
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage({ text: t('quickStartUnitTypePrompt') })}
                    className="rounded-lg border border-gray-200/80 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-sage-300 hover:bg-sage-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-sage-700 dark:hover:bg-sage-900/20"
                  >
                    {t('quickStartUnitTypeTitle')}
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <SageAiMessageRow
                key={message.id}
                message={message}
                isLoading={isLoading}
                currentSessionId={currentSessionId}
                feedbackModel={feedbackModel}
                feedback={feedbackBySessionMessage[message.id]}
                onFeedbackChange={handleFeedbackChange}
                copiedId={copiedId}
                onCopyText={handleCopyText}
                onSendMessage={handleSendMessageText}
                onToast={showToast}
                onOpenSaveQueryDialog={openSaveQueryDialog}
                onUserMessageElement={registerUserMessageEl}
                isEditing={editingMessageId === message.id}
                editingDraft={editingMessageId === message.id ? editingDraft : ''}
                onEditingDraftChange={setEditingDraft}
                onBeginEdit={beginEditMessage}
                onCancelEdit={cancelEditMessage}
                onSubmitEdit={submitEditMessage}
                getInjectedQueryData={getInjectedQueryData}
                onPythonError={handlePythonError}
                pythonRetryCount={pythonRetryCount}
              />
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
              <SageAiThreadUsageBar sessionId={currentSessionId} refreshKey={usageRefreshKey} />
              <div className="flex items-end gap-1 rounded-xl border border-neutral-200/70 bg-white px-2 py-2 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                <div className="mb-1 flex-shrink-0">
                  <SageAiModelPicker
                    selection={modelSelection}
                    onSelectionChange={setModelSelection}
                    webResearchServerEnabled={webResearchServerEnabled}
                    webResearchEnabled={webResearchEnabled}
                    onWebResearchChange={setWebResearchEnabled}
                    disabled={isLoading}
                  />
                </div>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t('inputPlaceholder')}
                  rows={1}
                  className="min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                  style={{ minHeight: '40px', maxHeight: '200px' }}
                  disabled={isLoading}
                />
                {showComposerStop ? (
                  <button
                    type="button"
                    onClick={() => {
                      void stop();
                      abortAllPythonBlockRuns();
                    }}
                    className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 transition-colors hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300"
                    title={t('stopGenerating')}
                  >
                    <Square className="h-3 w-3 fill-current text-white dark:text-gray-900" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    aria-label={t('inputPlaceholder')}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast notification. The outer wrapper is ALWAYS mounted and carries
          the aria-live region so screen readers announce each new toast — a
          live region added to the DOM at the same time as its content is not
          reliably announced. The visible card renders inside it. */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      >
        {toastMessage && (
          <div
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg animate-in fade-in slide-in-from-bottom-4 dark:bg-gray-100 dark:text-gray-900"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {toastMessage}
            <button
              onClick={() => setToastMessage(null)}
              aria-label={t('dismiss')}
              className="ml-2 hover:opacity-70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

