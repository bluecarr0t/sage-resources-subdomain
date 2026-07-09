'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { useTranslations } from 'next-intl';

export interface SageAiSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SageAiSavedQuery {
  id: string;
  name: string;
  query: string;
  use_count: number;
  created_at: string;
}

function formatSessionDate(
  dateStr: string,
  t: ReturnType<typeof useTranslations<'admin.sageAi'>>
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return t('thisWeek');
  return t('older');
}

export type UseSageAiSessionsOptions = {
  showToast: (msg: string) => void;
  /** Reset chat UI when starting fresh or after bulk delete. */
  onChatReset: () => void;
  /** Apply hydrated messages after picking a session (do not change useChat transport id). */
  onSessionLoaded: (sessionId: string, messages: UIMessage[]) => void;
  onSessionFeedbackLoaded: (map: Record<string, { rating: 1 | -1 }>) => void;
  stopActiveStream: () => void;
  focusInput: () => void;
  setSidebarOpen: (open: boolean) => void;
};

export function useSageAiSessions({
  showToast,
  onChatReset,
  onSessionLoaded,
  onSessionFeedbackLoaded,
  stopActiveStream,
  focusInput,
  setSidebarOpen,
}: UseSageAiSessionsOptions) {
  const t = useTranslations('admin.sageAi');

  const [sessions, setSessions] = useState<SageAiSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const [savedQueries, setSavedQueries] = useState<SageAiSavedQuery[]>([]);
  const [savedQueriesLoading, setSavedQueriesLoading] = useState(true);
  const [savedQueriesError, setSavedQueriesError] = useState<string | null>(null);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [queryToSave, setQueryToSave] = useState('');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Monotonic token guarding session loads: rapid clicks on different history
   * entries fire overlapping fetches, and without this the SLOWEST response
   * would win and overwrite the conversation the user actually selected.
   */
  const loadSessionGenRef = useRef(0);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await fetch('/api/admin/sage-ai/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      } else {
        setSessionsError(t('sessionsLoadError'));
      }
    } catch {
      setSessionsError(t('sessionsLoadError'));
    } finally {
      setSessionsLoading(false);
    }
  }, [t]);

  const loadSavedQueries = useCallback(async () => {
    setSavedQueriesLoading(true);
    setSavedQueriesError(null);
    try {
      const res = await fetch('/api/admin/sage-ai/saved-queries');
      if (res.ok) {
        const data = await res.json();
        setSavedQueries(data.queries ?? []);
      } else {
        setSavedQueriesError(t('savedQueriesLoadError'));
      }
    } catch {
      setSavedQueriesError(t('savedQueriesLoadError'));
    } finally {
      setSavedQueriesLoading(false);
    }
  }, [t]);

  const saveSession = useCallback(
    async (msgs: UIMessage[], sessionId: string | null) => {
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
    },
    [loadSessions, showToast, t]
  );

  const openSaveQueryDialog = useCallback((query: string) => {
    setQueryToSave(query);
    setSaveQueryName('');
    setShowSaveDialog(true);
  }, []);

  const handleSaveQuery = useCallback(async () => {
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
  }, [loadSavedQueries, queryToSave, saveQueryName, showToast, t]);

  const handleUseSavedQuery = useCallback(
    async (query: SageAiSavedQuery, applyQueryToInput: (text: string) => void) => {
      applyQueryToInput(query.query);
      setSidebarOpen(false);
      focusInput();

      try {
        await fetch(`/api/admin/sage-ai/saved-queries/${query.id}`, {
          method: 'POST',
        });
        loadSavedQueries();
      } catch {
        /* non-critical */
      }
    },
    [focusInput, loadSavedQueries, setSidebarOpen]
  );

  const deleteSavedQuery = useCallback(
    async (queryId: string) => {
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
    },
    [showToast, t]
  );

  const loadSessionFeedback = useCallback(
    async (sessionId: string) => {
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
          onSessionFeedbackLoaded(map);
        }
      } catch (e) {
        console.error('Failed to load feedback:', e);
      }
    },
    [onSessionFeedbackLoaded]
  );

  const handleLoadSession = useCallback(
    async (sessionId: string) => {
      const gen = ++loadSessionGenRef.current;
      try {
        const res = await fetch(`/api/admin/sage-ai/sessions/${sessionId}`);
        // A newer load started while this one was in flight — discard.
        if (gen !== loadSessionGenRef.current) return;
        if (res.ok) {
          const data = await res.json();
          if (gen !== loadSessionGenRef.current) return;
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
          stopActiveStream();
          onSessionLoaded(sessionId, hydratedMessages);
          // Set the ref synchronously too: the debounced auto-save reads the
          // ref, and the effect that syncs it runs a tick after state commits.
          currentSessionIdRef.current = sessionId;
          setCurrentSessionId(sessionId);
          setSidebarOpen(false);
        } else {
          console.error('Failed to load session:', res.status, res.statusText);
          showToast(t('loadSessionError'));
        }
      } catch (e) {
        if (gen !== loadSessionGenRef.current) return;
        console.error('Failed to load session:', e);
        showToast(t('loadSessionError'));
      }

      if (gen !== loadSessionGenRef.current) return;
      void loadSessionFeedback(sessionId);
    },
    [
      loadSessionFeedback,
      onSessionLoaded,
      setSidebarOpen,
      showToast,
      stopActiveStream,
      t,
    ]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`/api/admin/sage-ai/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          if (currentSessionIdRef.current === sessionId) {
            onChatReset();
            setCurrentSessionId(null);
          }
        }
      } catch (e) {
        console.error('Failed to delete session:', e);
      }
    },
    [onChatReset]
  );

  const clearAllHistory = useCallback(async () => {
    if (sessions.length === 0) return;

    try {
      const res = await fetch('/api/admin/sage-ai/sessions', { method: 'DELETE' });
      if (!res.ok) {
        showToast(t('toastClearHistoryFailed'));
        return;
      }
      setSessions([]);
      onChatReset();
      setCurrentSessionId(null);
      showToast(t('toastHistoryCleared'));
    } catch (e) {
      console.error('Failed to clear history:', e);
      showToast(t('toastClearHistoryFailed'));
    }
  }, [onChatReset, sessions.length, showToast, t]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, SageAiSession[]> = {};
    for (const session of sessions) {
      const group = formatSessionDate(session.updated_at, t);
      if (!groups[group]) groups[group] = [];
      groups[group].push(session);
    }
    return groups;
  }, [sessions, t]);

  const currentSessionTitle = sessions.find((s) => s.id === currentSessionId)?.title;

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s))
    );
  }, []);

  useEffect(() => {
    loadSessions();
    loadSavedQueries();
  }, [loadSessions, loadSavedQueries]);

  return {
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
  };
}
