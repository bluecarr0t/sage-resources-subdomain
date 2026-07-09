'use client';

/**
 * History / saved-queries sidebar, extracted verbatim from SageAiClient.tsx.
 * Owns no state — everything is driven by the parent + useSageAiSessions.
 */

import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  Bookmark,
  History,
  Loader2,
  PanelLeftClose,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { SageAiSessionTitleEditor } from './SageAiSessionTitleEditor';
import type { SageAiSavedQuery, SageAiSession } from './useSageAiSessions';

export type SageAiPendingConfirm =
  | { kind: 'deleteSession'; sessionId: string; title: string }
  | { kind: 'clearHistory' }
  | { kind: 'deleteSavedQuery'; queryId: string; name: string };

export type SidebarTab = 'history' | 'saved';

export type SageAiSidebarProps = {
  sidebarTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  currentSessionId: string | null;
  currentSessionTitle: string | undefined;
  onRenameSession: (sessionId: string, title: string) => void;
  showToast: (msg: string) => void;
  onNewChat: () => void;
  onRequestConfirm: (confirm: SageAiPendingConfirm) => void;
  sessions: SageAiSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onRetrySessions: () => void;
  groupedSessions: Record<string, SageAiSession[]>;
  onLoadSession: (sessionId: string) => void;
  savedQueries: SageAiSavedQuery[];
  savedQueriesLoading: boolean;
  savedQueriesError: string | null;
  onRetrySavedQueries: () => void;
  onUseSavedQuery: (query: SageAiSavedQuery) => void;
};

export function SageAiSidebar({
  sidebarTab,
  onTabChange,
  onClose,
  currentSessionId,
  currentSessionTitle,
  onRenameSession,
  showToast,
  onNewChat,
  onRequestConfirm,
  sessions,
  sessionsLoading,
  sessionsError,
  onRetrySessions,
  groupedSessions,
  onLoadSession,
  savedQueries,
  savedQueriesLoading,
  savedQueriesError,
  onRetrySavedQueries,
  onUseSavedQuery,
}: SageAiSidebarProps) {
  const t = useTranslations('admin.sageAi');

  return (
    // Mobile: fixed overlay drawer (does not squeeze the chat to a sliver on
    // narrow screens). md+: in-flow static column, unchanged from before.
    <div className="fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-shrink-0 flex-col border-r border-neutral-200/75 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950 md:static md:z-auto md:w-64 md:max-w-none md:shadow-none">
      <div className="p-3 border-b border-neutral-200/75 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => onTabChange('history')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sidebarTab === 'history'
                ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1" />
            {t('history')}
          </button>
          <button
            onClick={() => onTabChange('saved')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sidebarTab === 'saved'
                ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 inline mr-1" />
            {t('saved')}
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <PanelLeftClose className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {sidebarTab === 'history' && (
        <>
          <div className="p-2">
            {currentSessionId && currentSessionTitle ? (
              <div className="mb-2 rounded-lg border border-neutral-200/75 bg-neutral-50/80 px-1 py-1 dark:border-neutral-800 dark:bg-neutral-900/50">
                <SageAiSessionTitleEditor
                  sessionId={currentSessionId}
                  title={currentSessionTitle}
                  onRenamed={(title) => onRenameSession(currentSessionId, title)}
                  showToast={showToast}
                />
              </div>
            ) : null}
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200/75 dark:border-neutral-800 hover:bg-neutral-50/90 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('newChat')}
            </button>
            <button
              type="button"
              onClick={() => onRequestConfirm({ kind: 'clearHistory' })}
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
                <button onClick={onRetrySessions} className="text-xs text-sage-600 hover:underline">
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
                            ? 'bg-white dark:bg-neutral-900 shadow-sm'
                            : 'hover:bg-white dark:hover:bg-gray-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onLoadSession(session.id)}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestConfirm({
                              kind: 'deleteSession',
                              sessionId: session.id,
                              title: session.title,
                            });
                          }}
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
              <button onClick={onRetrySavedQueries} className="text-xs text-sage-600 hover:underline">
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
                  onClick={() => onUseSavedQuery(query)}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestConfirm({
                      kind: 'deleteSavedQuery',
                      queryId: query.id,
                      name: query.name,
                    });
                  }}
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
  );
}
