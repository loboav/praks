import React, { useState } from 'react';

interface SearchPanelProps {
  findPath: (from: number, to: number) => void;
  path: number[];
}

const SearchPanel: React.FC<SearchPanelProps> = ({ findPath, path }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <div style={{ position: 'absolute', bottom: 16, right: 16, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h3>Поиск пути</h3>
      <form onSubmit={e => { e.preventDefault(); findPath(Number(from), Number(to)); }}>
        <input name="from" type="number" placeholder="ID от" required value={from} onChange={e => setFrom(e.target.value)} />
        <input name="to" type="number" placeholder="ID до" required value={to} onChange={e => setTo(e.target.value)} />
        <button type="submit">Найти путь</button>
      </form>
      {path.length > 0 && <div>Путь: {path.join(' → ')}</div>}
    </div>
  );
};

export default SearchPanel;
