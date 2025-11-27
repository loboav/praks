import React from 'react';
import LayoutSelector, { LayoutType } from './LayoutSelector';

interface TopToolbarProps {
    canEdit: boolean;
    isAdmin: boolean;
    onAddObject: () => void;
    onSave: () => void;
    onHistory: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    historyPanelOpen: boolean;
    historyCount: number;
    currentLayout: LayoutType;
    onLayoutChange: (layout: LayoutType) => void;
    onApplyLayout: () => void;
    isApplyingLayout: boolean;
    onFilter: () => void;
    onSearch: () => void;
    onAnalytics: () => void;
    onAccount: () => void;
    searchPanelOpen: boolean;
    analyticsOpen: boolean;
    hasActiveFilters: boolean;
}

const TopToolbar: React.FC<TopToolbarProps> = ({
    canEdit,
    onAddObject,
    onSave,
    onHistory,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    historyPanelOpen,
    historyCount,
    currentLayout,
    onLayoutChange,
    onApplyLayout,
    isApplyingLayout,
    onFilter,
    onSearch,
    onAnalytics,
    onAccount,
    searchPanelOpen,
    analyticsOpen,
    hasActiveFilters,
}) => {
    return (
        <div style={toolbarContainer}>
            <div style={toolbarGroup}>
                {canEdit && (
                    <>
                        <button style={iconButton} onClick={onAddObject} title="Добавить объект">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>

                        <button style={iconButton} onClick={onSave} title="Сохранить layout">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" />
                                <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </button>
                    </>
                )}

                <button
                    style={{ ...iconButton, position: 'relative', background: historyPanelOpen ? 'rgba(76, 175, 80, 0.1)' : 'transparent' }}
                    onClick={onHistory}
                    title="История (Ctrl+H)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {historyCount > 0 && (
                        <span style={{ position: 'absolute', top: 2, right: 2, background: '#4CAF50', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {historyCount}
                        </span>
                    )}
                </button>

                <button style={{ ...iconButton, opacity: canUndo ? 1 : 0.3 }} onClick={onUndo} disabled={!canUndo} title="Отменить (Ctrl+Z)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <button style={{ ...iconButton, opacity: canRedo ? 1 : 0.3 }} onClick={onRedo} disabled={!canRedo} title="Повторить (Ctrl+Y)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div style={{ flex: 1 }} />

            <div style={toolbarGroup}>
                <div style={{ marginRight: 8 }}>
                    <LayoutSelector
                        currentLayout={currentLayout}
                        onLayoutChange={onLayoutChange}
                        onApply={onApplyLayout}
                        isApplying={isApplyingLayout}
                    />
                </div>

                <button
                    style={{ ...iconButton, position: 'relative' }}
                    onClick={onFilter}
                    title="Фильтр"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M4 6h16M6 12h12M8 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {hasActiveFilters && (
                        <span style={{ position: 'absolute', top: 2, right: 2, background: '#ff5722', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            !
                        </span>
                    )}
                </button>

                <button
                    style={{ ...iconButton, background: searchPanelOpen ? 'rgba(33, 150, 243, 0.1)' : 'transparent' }}
                    onClick={onSearch}
                    title="Поиск (Ctrl+F)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                <button
                    style={{ ...iconButton, background: analyticsOpen ? 'rgba(76, 175, 80, 0.1)' : 'transparent' }}
                    onClick={onAnalytics}
                    title="Аналитика"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M4 19V10m6 9V5m6 14v-7m6 7V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                <button style={iconButton} onClick={onAccount} title="Аккаунт">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                        <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

const toolbarContainer: React.CSSProperties = {
    height: 56,
    background: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 8,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    zIndex: 10,
};

const toolbarGroup: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
};

const iconButton: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#5f6368',
    padding: 8,
    cursor: 'pointer',
    borderRadius: 6,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
};

export default TopToolbar;
