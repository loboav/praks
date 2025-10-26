import React from 'react';
import { HistoryAction } from '../hooks/useHistory';

interface HistoryPanelProps {
  history: HistoryAction[];
  currentIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClose: () => void;
}

export default function HistoryPanel({
  history,
  currentIndex,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClose,
}: HistoryPanelProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'bulk_delete': return '🗑️×';
      case 'bulk_update': return '✏️×';
      case 'layout': return '📐';
      default: return '•';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        width: '320px',
        maxHeight: '500px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          История действий
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666',
            padding: '0 4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Отменить (Ctrl+Z)"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: canUndo ? '#2196F3' : '#e0e0e0',
            color: canUndo ? 'white' : '#999',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          ↶ Отменить
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Повторить (Ctrl+Y)"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: canRedo ? '#2196F3' : '#e0e0e0',
            color: canRedo ? 'white' : '#999',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          Повторить ↷
        </button>
      </div>

      {/* History List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {history.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#999',
              fontSize: '14px',
            }}
          >
            История пуста
          </div>
        ) : (
          history.map((action, index) => (
            <div
              key={action.id}
              style={{
                padding: '10px 12px',
                margin: '4px 0',
                background: index === currentIndex ? '#E3F2FD' : index > currentIndex ? '#f5f5f5' : 'white',
                borderRadius: '6px',
                borderLeft: index === currentIndex ? '3px solid #2196F3' : '3px solid transparent',
                opacity: index > currentIndex ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '16px' }}>{getActionIcon(action.type)}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>
                  {action.description}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#999', paddingLeft: '24px' }}>
                {formatTime(action.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e0e0e0',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center',
        }}
      >
        {history.length > 0 && `${currentIndex + 1} / ${history.length} действий`}
      </div>
    </div>
  );
}
