import React from 'react';

interface ToolbarProps {
  onSelect: () => void;
  onMove: () => void;
  onAlign: () => void;
  onFilter: () => void;
  onAddObjectType: () => void;
  onAddRelationType: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onSelect, onMove, onAlign, onFilter, onAddObjectType, onAddRelationType }) => {
  return (
    <div style={{ width: 56, background: '#23272f', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 12, height: '100vh' }}>
      <button title="Добавить тип объекта" onClick={onAddObjectType} style={iconBtn}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/><path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      <button title="Добавить тип связи" onClick={onAddRelationType} style={iconBtn}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="2" rx="1" fill="#fff"/><circle cx="7" cy="12" r="2" stroke="#fff" strokeWidth="2"/><circle cx="17" cy="12" r="2" stroke="#fff" strokeWidth="2"/></svg>
      </button>
      <button title="Выделить" onClick={onSelect} style={iconBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#fff" strokeWidth="2"/></svg></button>
      <button title="Переместить" onClick={onMove} style={iconBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></button>
      <button title="Выравнивание" onClick={onAlign} style={iconBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="4" rx="2" stroke="#fff" strokeWidth="2"/></svg></button>
      <button title="Фильтр" onClick={onFilter} style={iconBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M6 12h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></button>
    </div>
  );
};

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  padding: 0,
  marginBottom: 8,
  cursor: 'pointer',
  borderRadius: 8,
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
};

export default Toolbar;
