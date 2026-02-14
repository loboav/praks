import React from 'react';

interface BulkActionsPanelProps {
  selectedCount: number;
  onDelete: () => void;
  onChangeType: () => void;
  onClearSelection: () => void;
  onFindCommonNeighbors?: () => void;
}

export default function BulkActionsPanel({
  selectedCount,
  onDelete,
  onChangeType,
  onClearSelection,
  onFindCommonNeighbors,
}: BulkActionsPanelProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1000,
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#2196F3',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            background: '#2196F3',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
          }}
        >
          {selectedCount}
        </span>
        <span>выбрано</span>
      </div>

      <div style={{ width: '1px', height: '24px', background: '#e0e0e0' }} />

      {selectedCount >= 2 && onFindCommonNeighbors && (
        <button
          onClick={onFindCommonNeighbors}
          style={{
            background: 'none',
            border: '1px solid #9c27b0',
            color: '#9c27b0',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f3e5f5';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none';
          }}
        >
          🔗 Кто связывает?
        </button>
      )}

      <button
        onClick={onChangeType}
        style={{
          background: 'none',
          border: '1px solid #2196F3',
          color: '#2196F3',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#E3F2FD';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none';
        }}
      >
        🔄 Изменить тип
      </button>

      <button
        onClick={onDelete}
        style={{
          background: 'none',
          border: '1px solid #f44336',
          color: '#f44336',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#FFEBEE';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none';
        }}
      >
        🗑️ Удалить
      </button>

      <button
        onClick={onClearSelection}
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#f5f5f5';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none';
        }}
      >
        ✕ Отменить
      </button>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
