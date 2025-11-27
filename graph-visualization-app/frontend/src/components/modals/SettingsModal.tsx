import React, { useState, useRef } from 'react';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { exportGraph } from '../../utils/exportUtils';
import { importGraph } from '../../utils/importUtils';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from '../UserManagement';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    onClose();
    toast.info('Вы вышли из системы');
  };

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

  const downloadLink = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const handleExportImage = async (format: 'png' | 'jpeg' | 'svg' | 'pdf') => {
    const node = document.querySelector('.react-flow') as HTMLElement;
    if (!node) {
      toast.error('Не удалось найти область графа');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Генерация изображения...');

    try {
      // Фильтр для исключения элементов управления из скриншота
      const filter = (node: HTMLElement) => {
        const exclusionClasses = ['react-flow__controls', 'react-flow__panel', 'react-flow__attribution'];
        return !exclusionClasses.some((classname) => node.classList?.contains(classname));
      };

      let dataUrl;
      const fileName = `graph-export-${new Date().toISOString().slice(0, 10)}`;
      const options = { backgroundColor: '#fff', filter, pixelRatio: 2 };

      switch (format) {
        case 'png':
          dataUrl = await toPng(node, options);
          downloadLink(dataUrl, `${fileName}.png`);
          break;
        case 'jpeg':
          dataUrl = await toJpeg(node, options);
          downloadLink(dataUrl, `${fileName}.jpg`);
          break;
        case 'svg':
          dataUrl = await toSvg(node, { ...options, pixelRatio: 1 });
          downloadLink(dataUrl, `${fileName}.svg`);
          break;
        case 'pdf':
          // Для PDF сначала делаем PNG
          dataUrl = await toPng(node, options);
          const pdf = new jsPDF({
            orientation: node.offsetWidth > node.offsetHeight ? 'l' : 'p',
            unit: 'px',
            format: [node.offsetWidth, node.offsetHeight]
          });
          pdf.addImage(dataUrl, 'PNG', 0, 0, node.offsetWidth, node.offsetHeight);
          pdf.save(`${fileName}.pdf`);
          break;
      }
      toast.update(toastId, { render: 'Экспорт выполнен успешно', type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error(error);
      toast.update(toastId, { render: 'Ошибка при экспорте', type: 'error', isLoading: false, autoClose: 3000 });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (format: 'json' | 'graphml') => {
    if (!isAuthenticated || (user?.role !== 'Editor' && user?.role !== 'Admin')) {
      toast.error('Только редакторы и администраторы могут импортировать графы');
      return;
    }

    // Создаём временный input для выбора файла
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = format === 'json' ? '.json' : '.graphml,.xml';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      const result = await importGraph(file, format);
      setIsImporting(false);

      if (result.success) {
        toast.success(
          `Импорт завершён! Объектов: ${result.objectsImported}, Связей: ${result.relationsImported}`,
          { autoClose: 5000 }
        );
        // Перезагружаем страницу для обновления данных
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(`Ошибка импорта: ${result.error}`);
      }
    };

    input.click();
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

          {/* Auth Section */}
          {!isAuthenticated ? (
            <section style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#666', marginBottom: 16 }}>
                  Вы в режиме гостя. Войдите, чтобы редактировать граф.
                </p>
                <button
                  onClick={handleLogin}
                  style={{
                    padding: '12px 32px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔑 Войти в аккаунт
                </button>
              </div>
            </section>
          ) : (
            <section style={{ marginBottom: 32, borderBottom: '1px solid #e0e0e0', paddingBottom: 24 }}>
              <UserManagement />
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 24px',
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#fee';
                    e.currentTarget.style.borderColor = '#faa';
                    e.currentTarget.style.color = '#c33';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.color = '#666';
                  }}
                >
                  Выйти из аккаунта
                </button>
              </div>
            </section>
          )}

          {/* Export Section */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📤</span>
              Экспорт графа
            </h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
              Сохраните текущий граф в файл для резервного копирования или обмена данными
            </p>

            {/* Data Export */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#444', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Данные</h4>
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
            </div>

            {/* Image Export */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#444', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Изображение</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => handleExportImage('png')}
                  disabled={isExporting}
                  style={{ ...imageExportBtn, background: '#673AB7' }}
                  title="Скачать как PNG"
                >
                  <span style={{ fontSize: 18 }}>🖼️</span> PNG
                </button>
                <button
                  onClick={() => handleExportImage('jpeg')}
                  disabled={isExporting}
                  style={{ ...imageExportBtn, background: '#3F51B5' }}
                  title="Скачать как JPEG"
                >
                  <span style={{ fontSize: 18 }}>🖼️</span> JPEG
                </button>
                <button
                  onClick={() => handleExportImage('svg')}
                  disabled={isExporting}
                  style={{ ...imageExportBtn, background: '#E91E63' }}
                  title="Скачать как SVG"
                >
                  <span style={{ fontSize: 18 }}>📐</span> SVG
                </button>
                <button
                  onClick={() => handleExportImage('pdf')}
                  disabled={isExporting}
                  style={{ ...imageExportBtn, background: '#F44336' }}
                  title="Скачать как PDF"
                >
                  <span style={{ fontSize: 18 }}>📄</span> PDF
                </button>
              </div>
            </div>
          </section>

          {/* Import Section */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📥</span>
              Импорт графа
            </h3>
            {!isAuthenticated || (user?.role !== 'Editor' && user?.role !== 'Admin') ? (
              <p style={{ color: '#999', fontSize: 14, fontStyle: 'italic' }}>
                Импорт доступен только редакторам и администраторам
              </p>
            ) : (
              <>
                <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                  Загрузите файл для импорта данных в граф
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => handleImport('json')}
                    disabled={isImporting}
                    style={{
                      ...importBtn,
                      background: isImporting ? '#e0e0e0' : '#4CAF50',
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>JSON</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>Импорт из JSON файла</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleImport('graphml')}
                    disabled={isImporting}
                    style={{
                      ...importBtn,
                      background: isImporting ? '#e0e0e0' : '#2196F3',
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📊</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>GraphML</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>Импорт из GraphML файла</div>
                    </div>
                  </button>
                </div>
                <p style={{ color: '#ff9800', fontSize: 13, marginTop: 12, fontWeight: 500 }}>
                  ⚠️ Импорт добавит данные к существующему графу
                </p>
              </>
            )}
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

const importBtn: React.CSSProperties = {
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

const imageExportBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '12px',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
};

export default SettingsModal;
