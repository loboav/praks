import React, { useState, useEffect } from 'react';
import { ObjectType, RelationType } from '../../types/graph';

export interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  objectTypes: ObjectType[];
  relationTypes: RelationType[];
  onApplyFilter: (filters: FilterState) => void;
  currentFilters?: FilterState;
}

export interface FilterState {
  selectedObjectTypes: number[];
  selectedRelationTypes: number[];
  showIsolatedNodes: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  open,
  onClose,
  objectTypes,
  relationTypes,
  onApplyFilter,
  currentFilters,
}) => {
  const [selectedObjectTypes, setSelectedObjectTypes] = useState<number[]>(
    currentFilters?.selectedObjectTypes || objectTypes.map(t => t.id)
  );
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<number[]>(
    currentFilters?.selectedRelationTypes || relationTypes.map(t => t.id)
  );
  const [showIsolatedNodes, setShowIsolatedNodes] = useState<boolean>(
    currentFilters?.showIsolatedNodes ?? true
  );

  useEffect(() => {
    if (open && !currentFilters) {
      // При первом открытии выбираем все типы
      setSelectedObjectTypes(objectTypes.map(t => t.id));
      setSelectedRelationTypes(relationTypes.map(t => t.id));
      setShowIsolatedNodes(true);
    }
  }, [open, objectTypes, relationTypes, currentFilters]);

  if (!open) return null;

  const handleToggleObjectType = (id: number) => {
    setSelectedObjectTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleToggleRelationType = (id: number) => {
    setSelectedRelationTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSelectAllObjectTypes = () => {
    setSelectedObjectTypes(objectTypes.map(t => t.id));
  };

  const handleDeselectAllObjectTypes = () => {
    setSelectedObjectTypes([]);
  };

  const handleSelectAllRelationTypes = () => {
    setSelectedRelationTypes(relationTypes.map(t => t.id));
  };

  const handleDeselectAllRelationTypes = () => {
    setSelectedRelationTypes([]);
  };

  const handleApply = () => {
    onApplyFilter({
      selectedObjectTypes,
      selectedRelationTypes,
      showIsolatedNodes,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedObjectTypes(objectTypes.map(t => t.id));
    setSelectedRelationTypes(relationTypes.map(t => t.id));
    setShowIsolatedNodes(true);
  };

  const activeFiltersCount =
    (objectTypes.length - selectedObjectTypes.length) +
    (relationTypes.length - selectedRelationTypes.length) +
    (showIsolatedNodes ? 0 : 1);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '90%',
          maxWidth: 600,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>
              🔍 Фильтры графа
            </h2>
            {activeFiltersCount > 0 && (
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#666' }}>
                Активных фильтров: {activeFiltersCount}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666',
              padding: 4,
              lineHeight: 1,
            }}
            title="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
          }}
        >
          {/* Object Types Section */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#333' }}>
                📦 Типы объектов ({selectedObjectTypes.length}/{objectTypes.length})
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSelectAllObjectTypes}
                  style={linkButtonStyle}
                >
                  Выбрать все
                </button>
                <span style={{ color: '#ccc' }}>|</span>
                <button
                  onClick={handleDeselectAllObjectTypes}
                  style={linkButtonStyle}
                >
                  Снять все
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {objectTypes.length === 0 ? (
                <p style={{ color: '#999', fontSize: 14, fontStyle: 'italic' }}>
                  Типы объектов не найдены
                </p>
              ) : (
                objectTypes.map((type) => (
                  <label
                    key={type.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedObjectTypes.includes(type.id) ? '#f0f7ff' : '#f9f9f9',
                      border: `2px solid ${selectedObjectTypes.includes(type.id) ? '#2196f3' : '#e0e0e0'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedObjectTypes.includes(type.id)}
                      onChange={() => handleToggleObjectType(type.id)}
                      style={{
                        width: 18,
                        height: 18,
                        marginRight: 10,
                        cursor: 'pointer',
                        accentColor: '#2196f3',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#333', fontSize: 14 }}>
                        {type.name}
                      </div>
                      {type.description && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {type.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Relation Types Section */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#333' }}>
                🔗 Типы связей ({selectedRelationTypes.length}/{relationTypes.length})
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSelectAllRelationTypes}
                  style={linkButtonStyle}
                >
                  Выбрать все
                </button>
                <span style={{ color: '#ccc' }}>|</span>
                <button
                  onClick={handleDeselectAllRelationTypes}
                  style={linkButtonStyle}
                >
                  Снять все
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relationTypes.length === 0 ? (
                <p style={{ color: '#999', fontSize: 14, fontStyle: 'italic' }}>
                  Типы связей не найдены
                </p>
              ) : (
                relationTypes.map((type) => (
                  <label
                    key={type.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedRelationTypes.includes(type.id) ? '#f0fff4' : '#f9f9f9',
                      border: `2px solid ${selectedRelationTypes.includes(type.id) ? '#4caf50' : '#e0e0e0'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRelationTypes.includes(type.id)}
                      onChange={() => handleToggleRelationType(type.id)}
                      style={{
                        width: 18,
                        height: 18,
                        marginRight: 10,
                        cursor: 'pointer',
                        accentColor: '#4caf50',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#333', fontSize: 14 }}>
                        {type.name}
                      </div>
                      {type.description && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {type.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#333' }}>
              ⚙️ Дополнительные параметры
            </h3>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: '#f9f9f9',
                border: '2px solid #e0e0e0',
              }}
            >
              <input
                type="checkbox"
                checked={showIsolatedNodes}
                onChange={(e) => setShowIsolatedNodes(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  marginRight: 10,
                  cursor: 'pointer',
                  accentColor: '#ff9800',
                }}
              />
              <div>
                <div style={{ fontWeight: 500, color: '#333', fontSize: 14 }}>
                  Показывать изолированные узлы
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  Отображать объекты без связей
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={handleReset}
            style={{
              background: '#fff',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            🔄 Сбросить
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                background: '#fff',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              Отмена
            </button>
            <button
              onClick={handleApply}
              style={{
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1976d2';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2196f3';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
              }}
            >
              ✓ Применить фильтры
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2196f3',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
  transition: 'all 0.2s',
};

export default FilterModal;
