'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { downloadCsvFromData, downloadXlsxFromData, generateExportFilename } from '@/lib/sage-ai/csv-download';
import { PythonCodeBlock } from '@/lib/sage-ai/pyodide/PythonCodeBlock';
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

export default function SageAiClient() {
  const t = useTranslations('admin.sageAi');
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
  const [modelSelection, setModelSelection] = useState<SageAiModelSelection>({
    modelId: SAGE_AI_CHAT_DEFAULT_MODEL,
  });
  const [modelPrefsLoaded, setModelPrefsLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [savedQueriesError, setSavedQueriesError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
          },
        }),
      }),
    []
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg: string) => setToastMessage(msg), []);

  const handlePythonError = useCallback((error: string, code: string) => {
    setPythonRetryCount(prev => prev + 1);
    // Automatically ask the AI to fix the error
    sendMessage({
      text: `The Python code failed with this error:\n\n\`\`\`\n${error}\n\`\`\`\n\nOriginal code:\n\`\`\`python\n${code}\n\`\`\`\n\nPlease analyze the error and generate fixed Python code that will work correctly.`,
    });
  }, [sendMessage]);

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
        showToast('Failed to save session');
      }
    } catch {
      showToast('Failed to save session');
    }
  }, [loadSessions, showToast]);

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
        showToast('Query saved');
      } else {
        showToast('Failed to save query');
      }
    } catch {
      showToast('Failed to save query');
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
        showToast('Failed to delete saved query');
      }
    } catch {
      showToast('Failed to delete saved query');
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

  // Handle scroll events to detect if user has scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100; // Within 100px of bottom
    
    setIsAtBottom(atBottom);
    if (!atBottom && isLoading) {
      setUserHasScrolled(true);
    }
    if (atBottom) {
      setUserHasScrolled(false);
    }
  }, [isLoading]);

  // Auto-scroll only if user hasn't manually scrolled up
  useEffect(() => {
    if (!userHasScrolled && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userHasScrolled, isAtBottom]);

  // Reset scroll state when a new message is sent
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      setUserHasScrolled(false);
      setIsAtBottom(true);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    setUserHasScrolled(false);
    setIsAtBottom(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        if (part.state !== 'output-available') continue;
        const output = part.output;
        if (!output || typeof output !== 'object') continue;
        const outputObj = output as Record<string, unknown>;
        if ('data' in outputObj && Array.isArray(outputObj.data) && outputObj.data.length > 0) {
          setLastQueryData(outputObj.data as Record<string, unknown>[]);
        } else if ('aggregates' in outputObj && Array.isArray(outputObj.aggregates) && outputObj.aggregates.length > 0) {
          setLastQueryData(outputObj.aggregates as Record<string, unknown>[]);
        }
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
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

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowSidebar(false);
    setPythonRetryCount(0);
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/sage-ai/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.session.messages ?? []);
        setCurrentSessionId(sessionId);
        setShowSidebar(false);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
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
        }
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

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
        showToast(err instanceof Error ? err.message : 'Failed to export XLSX');
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
                      {groupSessions.map((session) => (
                        <div
                          key={session.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleLoadSession(session.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLoadSession(session.id); } }}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-sm group flex items-center justify-between transition-colors cursor-pointer ${
                            currentSessionId === session.id
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          <span className="truncate flex-1 text-[13px]">{session.title}</span>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
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
                    role="button"
                    tabIndex={0}
                    onClick={() => handleUseSavedQuery(query)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUseSavedQuery(query); } }}
                    className="w-full text-left px-2 py-2 rounded-md text-sm group hover:bg-white dark:hover:bg-gray-800 transition-colors mb-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate text-[13px]">
                        {query.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3 text-sage-600 opacity-0 group-hover:opacity-100" />
                        <button
                          onClick={(e) => handleDeleteSavedQuery(query.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {query.query}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[400px] p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('saveQuery')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                {t('saveQueryName')}
              </label>
              <input
                type="text"
                value={saveQueryName}
                onChange={(e) => setSaveQueryName(e.target.value)}
                placeholder={t('saveQueryPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent focus:outline-none"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-xs">
              {queryToSave}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {t('saveQueryCancel')}
              </button>
              <button
                onClick={() => void handleSaveQuery()}
                disabled={!saveQueryName.trim()}
                className="px-4 py-2 text-sm font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('saveQueryConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

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
          className="flex-1 overflow-y-auto relative"
        >
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  <button
                    onClick={() => sendMessage({ text: "What's the average daily rate for glamping properties by state?" })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">💰</span>
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
                    onClick={() => sendMessage({ text: "Show me a sample of RV sites from Campspot and RoverPass databases - what data do we have?" })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">🚐</span>
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
                    onClick={() => sendMessage({ text: "What glamping unit types are most popular in Colorado? Query both Sage and Hipcamp databases. Only include properties with at least 5 units and where glamping units (not RV, tent, or vehicle sites) make up at least 40% of total units. Show me a breakdown with property counts." })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">⛺</span>
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
                    onClick={() => sendMessage({ text: "Which states have both National Parks and glamping properties? Show me the top states with counts of each." })}
                    className="flex items-start gap-3 p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sage-300 dark:hover:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all group"
                  >
                    <span className="text-lg">🏞️</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                        {t('quickStartParksTitle')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('quickStartParksDesc')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="mb-6">
                {message.role === 'user' ? (
                  <div className="group relative">
                    <div className="text-[15px] text-gray-900 dark:text-gray-100 leading-relaxed">
                      {message.parts.map((part, partIndex) => {
                        if (part.type === 'text') {
                          return (
                            <div key={partIndex} className="whitespace-pre-wrap">
                              {part.text}
                              <button
                                onClick={() => openSaveQueryDialog(part.text)}
                                className="ml-2 inline-flex opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t('saveQuery')}
                              >
                                <BookmarkPlus className="w-4 h-4 text-gray-400 hover:text-sage-600" />
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed group/response">
                    {message.parts.map((part, partIndex) => {
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
                                components={{
                                  ul: ({ children }) => (
                                    <ul className="space-y-1.5">{children}</ul>
                                  ),
                                  li: ({ children }) => {
                                    // Extract text content from children
                                    const extractText = (node: React.ReactNode): string => {
                                      if (typeof node === 'string') return node;
                                      if (typeof node === 'number') return String(node);
                                      if (!node) return '';
                                      if (Array.isArray(node)) return node.map(extractText).join('');
                                      if (typeof node === 'object' && 'props' in node) {
                                        return extractText((node as React.ReactElement).props.children);
                                      }
                                      return '';
                                    };
                                    
                                    // Check if children contains nested lists (ul elements)
                                    const hasNestedList = (node: React.ReactNode): boolean => {
                                      if (!node) return false;
                                      if (Array.isArray(node)) return node.some(hasNestedList);
                                      if (typeof node === 'object' && 'type' in node) {
                                        const el = node as React.ReactElement;
                                        if (el.type === 'ul' || el.type === 'ol') return true;
                                        if (el.props?.children) return hasNestedList(el.props.children);
                                      }
                                      return false;
                                    };
                                    
                                    const textContent = extractText(children).trim();
                                    const containsNestedList = hasNestedList(children);
                                    
                                    // Check if this looks like a clickable suggestion
                                    // Must be a question-like prompt, not data or amenities
                                    const looksLikeSuggestion = 
                                      !containsNestedList && // No nested lists
                                      textContent.length > 20 && // Longer than typical data items
                                      textContent.length < 150 &&
                                      !/^\d+[\s,]/.test(textContent) && // Doesn't start with numbers
                                      !/\$[\d,]+/.test(textContent) && // No price data
                                      !textContent.includes('http') && // No URLs
                                      !/\d{2,}/.test(textContent.slice(0, 20)) && // No long numbers at start
                                      !textContent.endsWith(':') && // Not a label like "Amenities:"
                                      !/^[A-Z][a-z]+(\s*[,&]\s*[A-Z]?[a-z]+)*$/.test(textContent) && // Not comma/ampersand separated items like "Pet friendly, Family friendly"
                                      textContent.split(' ').length >= 4; // At least 4 words (suggests a question/prompt)
                                    
                                    if (looksLikeSuggestion) {
                                      return (
                                        <li className="flex items-start gap-2">
                                          <span className="text-sage-500 mt-1.5 text-xs">●</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              sendMessage({ text: textContent });
                                            }}
                                            className="flex-1 text-left hover:text-sage-600 dark:hover:text-sage-400 hover:underline cursor-pointer transition-colors"
                                          >
                                            {children}
                                          </button>
                                        </li>
                                      );
                                    }
                                    
                                    return (
                                      <li className="flex items-start gap-2">
                                        <span className="text-sage-500 mt-1.5 text-xs">●</span>
                                        <span className="flex-1">{children}</span>
                                      </li>
                                    );
                                  },
                                }}
                              >
                                {part.text}
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
                              {part.state === 'input-streaming' && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              )}
                              {part.state === 'input-available' && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">{t('toolRunning')}</span>
                              )}
                              {part.state === 'output-available' && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                              )}
                            </div>

                            {part.state === 'output-available' && toolOutput != null && (
                              <div className="px-3 py-2">
                                {typeof toolOutput === 'object' &&
                                toolOutput !== null &&
                                'type' in toolOutput &&
                                (toolOutput as unknown as { type: string }).type === 'python_code' ? (
                                  (() => {
                                    const pyOutput = toolOutput as unknown as {
                                      code: string;
                                      description: string;
                                      uses_query_data?: boolean;
                                    };
                                    return (
                                      <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                          {pyOutput.description}
                                        </p>
                                        <PythonCodeBlock
                                          code={pyOutput.code}
                                          onDataInject={
                                            pyOutput.uses_query_data
                                              ? () => lastQueryData
                                              : undefined
                                          }
                                          onError={handlePythonError}
                                          retryCount={pythonRetryCount}
                                        />
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {typeof toolOutput === 'object' && toolOutput !== null && 'error' in toolOutput ? (
                                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{String((toolOutput as { error: string }).error)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          {typeof toolOutput === 'object' && 'total_count' in (toolOutput as object) && (
                                            <span>
                                              {t('toolFoundResults', { total: (toolOutput as { total_count: number }).total_count })}
                                              {typeof toolOutput === 'object' && 'returned_count' in (toolOutput as object) &&
                                                ` · ${t('toolShowingResults', { count: (toolOutput as { returned_count: number }).returned_count })}`}
                                            </span>
                                          )}
                                          {typeof toolOutput === 'object' && 'count' in (toolOutput as object) && !('total_count' in (toolOutput as object)) && (
                                            <span>{t('toolCount', { count: (toolOutput as { count: number }).count })}</span>
                                          )}
                                          {typeof toolOutput === 'object' && 'total_groups' in (toolOutput as object) && (
                                            <span>{t('toolGroups', { count: (toolOutput as { total_groups: number }).total_groups })}</span>
                                          )}
                                        </div>
                                        {hasExportableData(toolOutput) && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleDownloadCsv(toolOutput, toolName)}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            >
                                              <Download className="w-3 h-3" />
                                              CSV
                                            </button>
                                            <button
                                              onClick={() => void handleDownloadXlsx(toolOutput, toolName)}
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
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return null;
                    })}
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
                    disabled={isLoading}
                  />
                  <div className="flex-1" />
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={() => stop()}
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
