import React, { useState } from 'react';
import { exportGraph } from '../../utils/exportUtils';
import { toast } from 'react-toastify';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!open) return null;

  const handleExport = async (format: 'json' | 'graphml' | 'csv') => {
    setIsExporting(true);
    const result = await exportGraph(format);
    setIsExporting(false);

    if (result.success) {
      toast.success(`Граф экспортирован: ${result.fileName}`);
    } else {
      toast.error(`Ошибка экспорта: ${result.error}`);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            minWidth: 480,
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>⚙️</span>
              Настройки
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 28,
                cursor: 'pointer',
                color: '#999',
                padding: 0,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {/* Export Section */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📤</span>
              Экспорт графа
            </h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
              Сохраните текущий граф в файл для резервного копирования или обмена данными
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                style={{
                  ...exportBtn,
                  background: isExporting ? '#e0e0e0' : '#4CAF50',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>JSON</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Универсальный формат с полными данными</div>
                </div>
              </button>
              
              <button
                onClick={() => handleExport('graphml')}
                disabled={isExporting}
                style={{
                  ...exportBtn,
                  background: isExporting ? '#e0e0e0' : '#2196F3',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={{ fontSize: 20 }}>📊</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>GraphML</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Для Gephi, Cytoscape и других инструментов</div>
                </div>
              </button>
            </div>
          </section>

          {/* Import Section (Coming Soon) */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📥</span>
              Импорт графа
              <span style={{ fontSize: 12, background: '#FFC107', color: '#000', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                Скоро
              </span>
            </h3>
            <p style={{ color: '#999', fontSize: 14, fontStyle: 'italic' }}>
              Функция импорта будет доступна в следующей версии
            </p>
          </section>

          {/* Theme Section (Coming Soon) */}
          <section>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎨</span>
              Тема интерфейса
              <span style={{ fontSize: 12, background: '#FFC107', color: '#000', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                Скоро
              </span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'not-allowed', opacity: 0.6 }}>
                <input type="radio" name="theme" disabled checked />
                <div>
                  <div style={{ fontWeight: 600 }}>☀️ Светлая</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Текущая тема</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'not-allowed', opacity: 0.6 }}>
                <input type="radio" name="theme" disabled />
                <div>
                  <div style={{ fontWeight: 600 }}>🌙 Темная</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Будет доступна позже</div>
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

const exportBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 16,
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
};

export default SettingsModal;
