import React, { useState, useEffect } from "react";
import { ObjectType, RelationType, PathAlgorithm, AlgorithmOption } from "../types/graph";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  objectTypes: ObjectType[];
  relationTypes: RelationType[];
  onAddObjectType: () => void;
  onAddRelationType: () => void;
  onDeleteObjectType: (id: number) => void;
  onDeleteRelationType: (id: number) => void;
  selectedAlgorithm: PathAlgorithm;
  onAlgorithmChange: (algorithm: PathAlgorithm) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  objectTypes,
  relationTypes,
  onAddObjectType,
  onAddRelationType,
  onDeleteObjectType,
  onDeleteRelationType,
  selectedAlgorithm,
  onAlgorithmChange,
}) => {
  const { user } = useAuth();
  const canManageTypes = user?.role === 'Admin' || user?.role === 'Editor';

  // Load collapse state from localStorage
  const [objectTypesExpanded, setObjectTypesExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_objectTypes_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const [relationTypesExpanded, setRelationTypesExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_relationTypes_expanded');
    return saved !== null ? saved === 'true' : false;
  });

  const [algorithmsExpanded, setAlgorithmsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_algorithms_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  // Список алгоритмов
  const algorithms: AlgorithmOption[] = [
    {
      id: 'dijkstra',
      name: 'Dijkstra',
      description: 'Кратчайший путь с весами',
      icon: '',
    },
    {
      id: 'astar',
      name: 'A*',
      description: 'Эвристический поиск',
      icon: '',
    },
    {
      id: 'bfs',
      name: 'BFS',
      description: 'Поиск в ширину',
      icon: '',
    },
    {
      id: 'k-shortest',
      name: 'K путей',
      description: 'Несколько кратчайших путей',
      icon: '',
      requiresConfig: true,
    },
    {
      id: 'all-paths',
      name: 'Все пути',
      description: 'DFS - все возможные',
      icon: '',
    },
  ];

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_objectTypes_expanded', String(objectTypesExpanded));
  }, [objectTypesExpanded]);

  useEffect(() => {
    localStorage.setItem('sidebar_relationTypes_expanded', String(relationTypesExpanded));
  }, [relationTypesExpanded]);

  useEffect(() => {
    localStorage.setItem('sidebar_algorithms_expanded', String(algorithmsExpanded));
  }, [algorithmsExpanded]);

  const handleDeleteObjectType = async (id: number) => {
    if (window.confirm("Удалить тип объекта?")) {
      try {
        await onDeleteObjectType(id);
        toast.success("Тип объекта удален");
      } catch (error) {
        toast.error("Ошибка при удалении типа объекта");
      }
    }
  };

  const handleDeleteRelationType = async (id: number) => {
    if (window.confirm("Удалить тип связи?")) {
      try {
        await onDeleteRelationType(id);
        toast.success("Тип связи удален");
      } catch (error) {
        toast.error("Ошибка при удалении типа связи");
      }
    }
  };

  const SectionHeader: React.FC<{
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
  }> = ({ title, count, expanded, onToggle }) => (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: expanded ? '#2196f3' : '#fff',
        color: expanded ? '#fff' : '#333',
        borderRadius: 6,
        cursor: 'pointer',
        marginBottom: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!expanded) e.currentTarget.style.background = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        if (!expanded) e.currentTarget.style.background = '#fff';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 16,
          fontWeight: 600,
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
      </div>
      <span style={{
        fontSize: 13,
        background: expanded ? 'rgba(255,255,255,0.2)' : '#e0e0e0',
        padding: '2px 8px',
        borderRadius: 12,
        fontWeight: 500,
      }}>
        {count}
      </span>
    </div>
  );

  return (
    <aside
      style={{
        width: 280,
        background: "#f9f9f9",
        padding: 12,
        borderRight: "1px solid #e0e0e0",
        height: "100vh",
        overflowY: "auto",
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Object Types Section */}
      <div>
        <SectionHeader
          title="Типы объектов"
          count={objectTypes.length}
          expanded={objectTypesExpanded}
          onToggle={() => setObjectTypesExpanded(!objectTypesExpanded)}
        />

        <div style={{
          maxHeight: objectTypesExpanded ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          {canManageTypes && (
            <button
              onClick={onAddObjectType}
              style={{
                width: '100%',
                marginBottom: 8,
                background: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#4CAF50'}
            >
              + Добавить
            </button>
          )}

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 6,
            padding: objectTypes.length > 0 ? '4px' : '0',
          }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {objectTypes.map((type) => (
                <li
                  key={type.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 14,
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{type.name}</span>
                  {canManageTypes && (
                    <button
                      onClick={() => handleDeleteObjectType(type.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#e53935",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: '0 4px',
                        marginLeft: 8,
                      }}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Relation Types Section */}
      <div>
        <SectionHeader
          title="Типы связей"
          count={relationTypes.length}
          expanded={relationTypesExpanded}
          onToggle={() => setRelationTypesExpanded(!relationTypesExpanded)}
        />

        <div style={{
          maxHeight: relationTypesExpanded ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          {canManageTypes && (
            <button
              onClick={onAddRelationType}
              style={{
                width: '100%',
                marginBottom: 8,
                background: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#4CAF50'}
            >
              + Добавить
            </button>
          )}

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 6,
            padding: relationTypes.length > 0 ? '4px' : '0',
          }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {relationTypes.map((type) => (
                <li
                  key={type.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 14,
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{type.name}</span>
                  {canManageTypes && (
                    <button
                      onClick={() => handleDeleteRelationType(type.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#e53935",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: '0 4px',
                        marginLeft: 8,
                      }}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Algorithms Section */}
      <div>
        <SectionHeader
          title="Алгоритмы поиска"
          count={algorithms.length}
          expanded={algorithmsExpanded}
          onToggle={() => setAlgorithmsExpanded(!algorithmsExpanded)}
        />

        <div style={{
          maxHeight: algorithmsExpanded ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 6,
            padding: '4px',
          }}>
            {algorithms.map((algo) => (
              <div
                key={algo.id}
                onClick={() => onAlgorithmChange(algo.id)}
                style={{
                  padding: '10px 12px',
                  background: selectedAlgorithm === algo.id ? '#e3f2fd' : '#fff',
                  borderLeft: selectedAlgorithm === algo.id ? '4px solid #2196f3' : '4px solid transparent',
                  cursor: 'pointer',
                  borderRadius: 4,
                  marginBottom: 4,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedAlgorithm !== algo.id) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAlgorithm !== algo.id) {
                    e.currentTarget.style.background = '#fff';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: selectedAlgorithm === algo.id ? 600 : 500,
                      fontSize: 14,
                      color: selectedAlgorithm === algo.id ? '#2196f3' : '#333',
                    }}>
                      {algo.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {algo.description}
                    </div>
                  </div>
                  {selectedAlgorithm === algo.id && (
                    <span style={{ color: '#2196f3', fontSize: 16 }}>✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
