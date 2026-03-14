import React, { useState } from 'react';

export type LayoutType = 'manual' | 'elk-layered' | 'elk-disjoint' | 'elk-random' | 'elk-rectpacking' | 'elk-mrtree' | 'elk-box';

interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  onApply: () => void;
  isApplying?: boolean;
}

const layoutOptions = [
  { value: 'elk-layered' as LayoutType, label: '📊 Иерархия' },
  { value: 'elk-disjoint' as LayoutType, label: '🧩 Разделение (DDG)' },
  { value: 'elk-random' as LayoutType, label: '🎲 Случайно' },
  { value: 'elk-rectpacking' as LayoutType, label: '📦 Упаковка узлов' },
  { value: 'elk-mrtree' as LayoutType, label: '🌲 Дерево' },
  { value: 'elk-box' as LayoutType, label: '⊞ Сетка' },
  { value: 'manual' as LayoutType, label: '✋ Вручную' },
];

export default function LayoutSelector({
  currentLayout,
  onLayoutChange,
  onApply,
  isApplying = false
}: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = layoutOptions.find(opt => opt.value === currentLayout);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
        }}
      >
        <span>{currentOption?.label || 'Layout'}</span>
        <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              minWidth: '280px',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            {layoutOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onLayoutChange(option.value);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: currentLayout === option.value ? '#E3F2FD' : 'white',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background 0.2s',
                  fontWeight: 500,
                  color: '#333',
                }}
                onMouseEnter={(e) => {
                  if (currentLayout !== option.value) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentLayout !== option.value) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                {option.label}
              </div>
            ))}

            <div style={{ padding: '12px 16px', background: '#f9f9f9', borderTop: '2px solid #e0e0e0' }}>
              <button
                onClick={() => {
                  onApply();
                  setIsOpen(false);
                }}
                disabled={isApplying}
                style={{
                  width: '100%',
                  background: isApplying ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isApplying ? 'not-allowed' : 'pointer',
                }}
              >
                {isApplying ? 'Применяется...' : '✓ Применить'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
