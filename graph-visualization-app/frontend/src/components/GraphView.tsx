import React, { useEffect, useState, useMemo } from 'react';
import { GraphObject, GraphRelation, PathAlgorithm } from '../types/graph';
import GraphCanvas from './GraphCanvas';
import ObjectCard from './ObjectCard';
import RelationCard from './RelationCard';
import AddObjectModal from './modals/AddObjectModal';
import AddRelationModal from './modals/AddRelationModal';
import AddObjectTypeModal from './modals/AddObjectTypeModal';
import AddRelationTypeModal from './modals/AddRelationTypeModal';
import FilterModal from './modals/FilterModal';
import SettingsModal from './modals/SettingsModal';
import Sidebar from './Sidebar';
import LayoutSelector from './LayoutSelector';
import BulkActionsPanel from './BulkActionsPanel';
import BulkChangeTypeModal from './modals/BulkChangeTypeModal';
import HistoryPanel from './HistoryPanel';
import SettingsButton from './SettingsButton';
import SearchPanel from './SearchPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import TopToolbar from './TopToolbar';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useMultiSelection } from '../hooks/useMultiSelection';
import { useHistory } from '../hooks/useHistory';
import { useLayoutManager } from '../hooks/useLayoutManager';
import { usePathFinding } from '../hooks/usePathFinding';
import { useGraphData } from '../hooks/useGraphData';
import { useGraphFilters } from '../hooks/useGraphFilters';
import { useBulkOperations } from '../hooks/useBulkOperations';
import { useTimelineFilter } from '../hooks/useTimelineFilter';
import { useNodeGrouping } from '../hooks/useNodeGrouping';
import { useEdgeGrouping } from '../hooks/useEdgeGrouping';
import { useCommonNeighbors } from '../hooks/useCommonNeighbors';
import TimelinePanel from './TimelinePanel';
import GeoMapView from './GeoMapView';
import GroupInfoPanel from './GroupInfoPanel';
import CommonNeighborsPanel from './CommonNeighborsPanel';
import EdgeGroupingPanel from './EdgeGroupingPanel';
import AggregatedEdgeCard from './AggregatedEdgeCard';

export default function GraphView() {
  const { user, isAuthenticated } = useAuth();
  const canEdit = isAuthenticated && (user?.role === 'Editor' || user?.role === 'Admin');
  const isAdmin = isAuthenticated && user?.role === 'Admin';

  // UI State
  const [selected, setSelected] = useState<any>(null);
  const [addObjectOpen, setAddObjectOpen] = useState(false);
  const [addRelation, setAddRelation] = useState<{
    source: GraphObject | null;
    target: GraphObject | null;
  }>({ source: null, target: null });
  const [addRelationOpen, setAddRelationOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [bulkChangeTypeOpen, setBulkChangeTypeOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [editNode, setEditNode] = useState<GraphObject | null>(null);
  const [editEdge, setEditEdge] = useState<GraphRelation | null>(null);
  const [addObjectTypeOpen, setAddObjectTypeOpen] = useState(false);
  const [addRelationTypeOpen, setAddRelationTypeOpen] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'map'>('graph');
  const [commonNeighborsPanelOpen, setCommonNeighborsPanelOpen] = useState(false);

  // Состояние выбранного алгоритма
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<PathAlgorithm>(() => {
    const saved = localStorage.getItem('selected_algorithm');
    return (saved as PathAlgorithm) || 'dijkstra';
  });

  // Сохранять выбор алгоритма
  useEffect(() => {
    localStorage.setItem('selected_algorithm', selectedAlgorithm);
    toast.info(`Алгоритм: ${selectedAlgorithm}`, { autoClose: 1500 });
  }, [selectedAlgorithm]);

  // Custom Hooks
  const { selectedIds, toggleSelection, selectAll, clearSelection } = useMultiSelection();
  const { history, currentIndex, addAction, undo, redo, canUndo, canRedo } = useHistory({
    maxSize: 20,
  });
  const { path, findPath } = usePathFinding();
  // Selected node IDs as array for manual grouping
  const selectedNodeIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const {
    results: commonNeighborsResults,
    loading: commonNeighborsLoading,
    error: commonNeighborsError,
    findCommonNeighbors,
    clearResults: clearCommonNeighbors,
  } = useCommonNeighbors();

  const {
    nodes,
    edges,
    objectTypes,
    relationTypes,
    setNodes,
    setEdges,
    loadInitialData,
    addObject,
    updateObject,
    deleteObject,
    addRelation: addRelationData,
    updateRelation,
    deleteRelation,
    updateNodesPositions,
    addObjectType,
    deleteObjectType,
    addRelationType,
    deleteRelationType,
    mergeNodesWithPositions,
    // Expand feature functions
    hideAll,
    showAll,
    expandNode,
    addNodeToView,
    isHiddenMode,
    hideNode,
  } = useGraphData({ onAddHistoryAction: addAction });

  const {
    currentLayoutType,
    setCurrentLayoutType,
    isApplyingLayout,
    applyLayout,
    saveLayout,
    loadLayout,
  } = useLayoutManager({
    nodes,
    edges,
    onNodesUpdate: setNodes,
    onAddHistoryAction: addAction,
  });

  const { filters, filteredNodes, filteredEdges, applyFilters, hasActiveFilters } = useGraphFilters(
    {
      nodes,
      edges,
      objectTypes,
      relationTypes,
    }
  );

  const { bulkDelete, bulkChangeType } = useBulkOperations({
    nodes,
    edges,
    setNodes,
    setEdges,
    mergeNodesWithPositions,
    onAddHistoryAction: addAction,
  });

  // Timeline Filter Hook
  const {
    dateRange,
    setDateRange,
    isTimelineEnabled,
    toggleTimeline,
    zoomLevel,
    setZoomLevel,
    histogramData,
    dateBoundaries,
    stats: timelineStats,
    filterEdgesByTimeline,
    filterNodesByTimeline,
  } = useTimelineFilter({ edges: filteredEdges, nodes: filteredNodes });

  // Apply timeline filter to edges
  const timelineFilteredEdges = useMemo(() => {
    return filterEdgesByTimeline(filteredEdges);
  }, [filteredEdges, filterEdgesByTimeline]);

  // Node Grouping Hook (Linkurious-style)
  const {
    rules: groupingRules,
    createRule: createGroupingRule,
    createManualGroup: createManualGroupingRule,
    deleteRule: deleteGroupingRule,
    toggleRule: toggleGroupingRule,
    activeRule: activeGroupingRule,
    groups: nodeGroups,
    toggleGroupCollapse,
    collapseAllGroups,
    expandAllGroups,
    transformedNodes: groupedTransformedNodes,
    transformedEdges: groupedTransformedEdges,
    availableProperties,
    computeGroupStats,
  } = useNodeGrouping({ nodes: filteredNodes, edges: timelineFilteredEdges, objectTypes });

  // Edge Grouping Hook — независимая группировка параллельных рёбер по типу
  const {
    enabledTypeIds: edgeGroupingEnabledTypes,
    toggleType: toggleEdgeGroupingType,
    enableAll: enableAllEdgeGrouping,
    disableAll: disableAllEdgeGrouping,
    groupedEdges: edgeGroupedEdges,
    selectedAggEdge,
    selectAggEdge,
    findAggEdge,
    groupCount: edgeGroupCount,
  } = useEdgeGrouping(groupedTransformedEdges, relationTypes);

  // Load initial data
  useEffect(() => {
    loadInitialData(loadLayout);
  }, [loadInitialData, loadLayout]);

  // Event Handlers
  const handleNodeAction = (action: string, node: GraphObject) => {
    if (action === 'create-relation') {
      if (addRelation.source && !addRelation.target && node.id !== addRelation.source.id) {
        setAddRelation(r => ({ ...r, target: node }));
        setAddRelationOpen(true);
      } else {
        setAddRelation({ source: node, target: null });
      }
    } else if (action === 'edit') {
      setEditNode(node);
    } else if (action === 'delete') {
      if (window.confirm('Удалить объект?')) {
        deleteObject(node);
      }
    } else if (action === 'hide') {
      hideNode(node.id);
    } else if (action === 'expand') {
      expandNode(node.id);
    } else if (action === 'expand-group') {
      // Для мета-узлов — развернуть группу
      if (node._collapsedGroupId) {
        toggleGroupCollapse(node._collapsedGroupId);
        toast.success('Группа развёрнута');
      }
    }
  };

  const [selectedGroup, setSelectedGroup] = useState<GraphObject | null>(null);

  const handleSelectNode = (node: GraphObject) => {
    if (node.isCollapsedGroup) {
      setSelectedGroup(node);
      setSelected(null); // Скрываем карточку обычного объекта
      return;
    }
    setSelected({ type: 'node', data: node });
    setSelectedGroup(null);
  };

  const handleAddRelationSubmit = async (data: {
    source: number;
    target: number;
    relationTypeId: number;
    properties: Record<string, string>;
  }) => {
    await addRelationData(data);
    setAddRelation({ source: null, target: null });
    setAddRelationOpen(false);
  };

  const handleEditEdge = (edge: GraphRelation) => {
    setEditEdge(edge);
  };

  const handleDeleteEdge = async (edge: GraphRelation) => {
    if (window.confirm('Удалить связь?')) {
      await deleteRelation(edge);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Удалить ${selectedIds.length} объект(ов)?`)) {
      await bulkDelete(selectedIds);
      clearSelection();
    }
  };

  const handleBulkChangeType = async (newTypeId: number) => {
    await bulkChangeType(selectedIds, newTypeId);
    clearSelection();
  };

  const handleSelectAllNodes = () => {
    selectAll(nodes.map(n => n.id));
    toast.info(`Выбрано ${nodes.length} объект(ов)`);
  };

  const handleFindCommonNeighbors = async () => {
    if (selectedIds.length < 2) {
      toast.warning('Выберите минимум 2 узла');
      return;
    }

    await findCommonNeighbors(selectedIds);
    setCommonNeighborsPanelOpen(true);
    toast.success(`Ищем общих знакомых между ${selectedIds.length} узлами...`);
  };

  const handleHighlightCommonNeighbors = (nodeIds: number[]) => {
    clearSelection();
    nodeIds.forEach(id => toggleSelection(id, true));
    toast.info(`Выделено ${nodeIds.length} узлов`);
  };

  const handleCommonNeighborNodeClick = (nodeId: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      handleSelectNode(node);
    }
  };

  const filteredRelationTypes =
    addRelation.source && addRelation.source.objectTypeId
      ? relationTypes.filter(rt => rt.objectTypeId === addRelation.source!.objectTypeId)
      : relationTypes;

  const nodesWithPositions = useMemo(() => {
    return groupedTransformedNodes.map((node: GraphObject) => ({
      ...node,
      x: typeof node.PositionX === 'number' ? node.PositionX : 0,
      y: typeof node.PositionY === 'number' ? node.PositionY : 0,
    }));
  }, [groupedTransformedNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'ф')) {
        e.preventDefault();
        handleSelectAllNodes();
      }

      if (e.key === 'Delete' && selectedIds.length > 0) {
        e.preventDefault();
        handleBulkDelete();
      }

      if (e.key === 'Escape') {
        if (searchPanelOpen) {
          setSearchPanelOpen(false);
        } else {
          clearSelection();
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я')) {
        e.preventDefault();
        undo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н')) {
        e.preventDefault();
        redo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'р')) {
        e.preventDefault();
        setHistoryPanelOpen(prev => !prev);
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'а')) {
        e.preventDefault();
        setSearchPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, nodes, undo, redo, clearSelection, searchPanelOpen]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f4f6fa', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          background: '#f4f6fa',
          overflow: 'hidden',
        }}
      >
        {/* Top Toolbar */}
        <TopToolbar
          canEdit={canEdit}
          isAdmin={isAdmin}
          onAddObject={() => setAddObjectOpen(true)}
          onSave={saveLayout}
          onHistory={() => setHistoryPanelOpen(!historyPanelOpen)}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          historyPanelOpen={historyPanelOpen}
          historyCount={history.length}
          currentLayout={currentLayoutType}
          onLayoutChange={setCurrentLayoutType}
          onApplyLayout={applyLayout}
          isApplyingLayout={isApplyingLayout}
          onFilter={() => setFilterOpen(!filterOpen)}
          onSearch={() => setSearchPanelOpen(!searchPanelOpen)}
          onAnalytics={() => setAnalyticsOpen(!analyticsOpen)}
          onAccount={() => setSettingsOpen(true)}
          searchPanelOpen={searchPanelOpen}
          analyticsOpen={analyticsOpen}
          hasActiveFilters={hasActiveFilters}
        />

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Sidebar
            objectTypes={objectTypes}
            relationTypes={relationTypes}
            onAddObjectType={() => setAddObjectTypeOpen(true)}
            onAddRelationType={() => setAddRelationTypeOpen(true)}
            onDeleteObjectType={id =>
              window.confirm('Удалить тип объекта?') && deleteObjectType(id)
            }
            onDeleteRelationType={id =>
              window.confirm('Удалить тип связи?') && deleteRelationType(id)
            }
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={setSelectedAlgorithm}
            // Grouping props
            groupingRules={groupingRules}
            activeGroupingRule={activeGroupingRule}
            availableProperties={availableProperties}
            onCreateGroupingRule={createGroupingRule}
            onCreateManualGroupingRule={createManualGroupingRule}
            onDeleteGroupingRule={deleteGroupingRule}
            onToggleGroupingRule={toggleGroupingRule}
            onCollapseAllGroups={collapseAllGroups}
            onExpandAllGroups={expandAllGroups}
            selectedNodeIds={selectedNodeIdsArray}
            groupedEdgesForStats={groupedTransformedEdges}
            edgeGroupingEnabledTypes={edgeGroupingEnabledTypes}
            edgeGroupCount={edgeGroupCount}
            onToggleEdgeGroupingType={toggleEdgeGroupingType}
            onEnableAllEdgeGrouping={() => enableAllEdgeGrouping(relationTypes.map(rt => rt.id))}
            onDisableAllEdgeGrouping={disableAllEdgeGrouping}
          />
          <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0 }}>
            {objectTypes.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 20,
                  fontFamily: 'Segoe UI, sans-serif',
                  color: '#5f6368',
                }}
              >
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ opacity: 0.3 }}
                >
                  <circle cx="12" cy="5" r="3" />
                  <circle cx="5" cy="19" r="3" />
                  <circle cx="19" cy="19" r="3" />
                  <line x1="12" y1="8" x2="5" y2="16" />
                  <line x1="12" y1="8" x2="19" y2="16" />
                </svg>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Граф пустой</h2>
                <p style={{ margin: 0, fontSize: 16, textAlign: 'center', maxWidth: 400 }}>
                  Начните с создания типов объектов в боковой панели, затем добавьте объекты на граф
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    onClick={() => setAddObjectTypeOpen(true)}
                    style={{
                      background: '#2196f3',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 24px',
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(33,150,243,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    Создать первый тип объекта
                  </button>
                  {objectTypes.length > 0 && canEdit && (
                    <button
                      onClick={() => setAddObjectOpen(true)}
                      style={{
                        background: '#fff',
                        color: '#2196f3',
                        border: '2px solid #2196f3',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Добавить объект
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* View Mode Toggle */}
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1000,
                    display: 'flex',
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setViewMode('graph')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: viewMode === 'graph' ? '#2196f3' : '#fff',
                      color: viewMode === 'graph' ? '#fff' : '#333',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    📊 Граф
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: viewMode === 'map' ? '#2196f3' : '#fff',
                      color: viewMode === 'map' ? '#fff' : '#333',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    🗺️ Карта
                  </button>
                </div>

                {viewMode === 'graph' ? (
                  <GraphCanvas
                    nodes={nodesWithPositions}
                    edges={edgeGroupedEdges}
                    relationTypes={relationTypes}
                    onSelectNode={node => {
                      const isShiftPressed = (window.event as KeyboardEvent)?.shiftKey;
                      if (isShiftPressed) {
                        toggleSelection(node.id, true);
                      } else {
                        handleSelectNode(node);
                        clearSelection();
                      }
                    }}
                    onSelectEdge={edge => {
                      // Check if it's an aggregated edge from edge grouping
                      const aggEdge = findAggEdge(edge.id);
                      if (aggEdge) {
                        selectAggEdge(aggEdge);
                        setSelected(null);
                        setSelectedGroup(null);
                        return;
                      }
                      setSelected({ type: 'edge', data: edge });
                    }}
                    onNodeAction={handleNodeAction}
                    onNodesPositionChange={updateNodesPositions}
                    selectedNodes={selectedIds}
                    selectedAlgorithm={selectedAlgorithm}
                    onNodeDoubleClick={node => {
                      if (node.isCollapsedGroup && node._collapsedGroupId) {
                        toggleGroupCollapse(node._collapsedGroupId);
                      } else {
                        expandNode(node.id);
                      }
                    }}
                    onPaneClick={() => {
                      setSelected(null);
                      setSelectedGroup(null);
                      clearSelection();
                    }}
                    onCollapseAllGroups={() => {
                      collapseAllGroups();
                      toast.success('Все группы свёрнуты');
                    }}
                    onExpandAllGroups={() => {
                      expandAllGroups();
                      toast.success('Все группы развёрнуты');
                    }}
                    onGroupSelected={nodeIds => {
                      const label = `Группа ${nodeIds.length} узлов`;
                      createManualGroupingRule(label, nodeIds);
                      toast.success(`Создана группа из ${nodeIds.length} узлов`);
                      clearSelection();
                    }}
                  />
                ) : (
                  <GeoMapView
                    nodes={nodesWithPositions}
                    edges={timelineFilteredEdges}
                    relationTypes={relationTypes}
                    onSelectNode={node => {
                      handleSelectNode(node);
                      clearSelection();
                    }}
                    onSelectEdge={edge => setSelected({ type: 'edge', data: edge })}
                    selectedNodes={selectedIds}
                  />
                )}

                {/* Панель информации о группе */}
                {selectedGroup &&
                  selectedGroup._collapsedNodeIds &&
                  (() => {
                    const grpId = (selectedGroup as any)._collapsedGroupId as string | undefined;
                    const foundGroup = nodeGroups.find(g => g.id === grpId);
                    const groupStats = foundGroup
                      ? computeGroupStats(foundGroup)
                      : { nodeCount: 0, numericStats: [], dateStats: [], stringDists: [] };
                    return (
                      <GroupInfoPanel
                        groupNode={selectedGroup}
                        nodesInGroup={nodes.filter(n =>
                          selectedGroup._collapsedNodeIds?.includes(n.id)
                        )}
                        objectTypes={objectTypes}
                        group={
                          foundGroup ?? {
                            id: grpId ?? '',
                            ruleId: '',
                            propertyValue: selectedGroup.name ?? 'Группа',
                            nodeIds: selectedGroup._collapsedNodeIds ?? [],
                            isCollapsed: true,
                            mode: 'manual' as const,
                          }
                        }
                        stats={groupStats}
                        onNodeClick={node => {
                          if (grpId) {
                            toggleGroupCollapse(grpId);
                            setTimeout(() => handleSelectNode(node), 100);
                          }
                        }}
                        onExpandGroup={() => {
                          if (grpId) {
                            toggleGroupCollapse(grpId);
                            setSelectedGroup(null);
                          }
                        }}
                        onClose={() => setSelectedGroup(null)}
                      />
                    );
                  })()}

                {/* Aggregated edge card */}
                {selectedAggEdge && (
                  <AggregatedEdgeCard
                    edge={selectedAggEdge}
                    relationTypes={relationTypes}
                    onClose={() => selectAggEdge(null)}
                  />
                )}

                {/* Панель общих знакомых */}
                {commonNeighborsPanelOpen && commonNeighborsResults && (
                  <CommonNeighborsPanel
                    requestedNodes={commonNeighborsResults.requestedNodes}
                    commonNeighbors={commonNeighborsResults.commonNeighbors}
                    allNodes={nodes}
                    onClose={() => {
                      setCommonNeighborsPanelOpen(false);
                      clearCommonNeighbors();
                    }}
                    onHighlight={handleHighlightCommonNeighbors}
                    onNodeClick={handleCommonNeighborNodeClick}
                  />
                )}

                {selected?.type === 'node' && <ObjectCard object={selected.data} />}
                {selected?.type === 'edge' && (
                  <RelationCard
                    relation={selected.data}
                    onEdit={() => handleEditEdge(selected.data)}
                    onDelete={() => handleDeleteEdge(selected.data)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Timeline Panel - Positioned as overlay above bottom bar */}
        {isTimelineVisible && (
          <div
            style={{
              position: 'absolute',
              bottom: 48, // Height of status bar
              left: 0,
              right: 0,
              zIndex: 9999,
              boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            }}
          >
            <TimelinePanel
              histogramData={histogramData}
              dateBoundaries={dateBoundaries}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              isEnabled={isTimelineEnabled}
              onToggleFilter={toggleTimeline}
              onClose={() => setIsTimelineVisible(false)}
              stats={timelineStats}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
            />
          </div>
        )}

        {/* Bottom Status Bar */}
        <div
          style={{
            height: 48,
            background: '#23272f',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            fontSize: 13,
            zIndex: 101,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ color: '#aaa' }}>
              Узлов: {filteredNodes.length}/{nodes.length} | Связей: {timelineFilteredEdges.length}/
              {edges.length}
              {hasActiveFilters && (
                <span style={{ color: '#ff9800', marginLeft: 8 }}>• Фильтры активны</span>
              )}
            </div>

            {/* Timeline Toggle Button */}
            <button
              onClick={() => setIsTimelineVisible(!isTimelineVisible)}
              style={{
                background: isTimelineVisible ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4,
                color: '#fff',
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                transition: 'all 0.2s',
              }}
            >
              <span>📅</span>
              Timeline
              {isTimelineEnabled && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#4caf50',
                    display: 'inline-block',
                  }}
                />
              )}
            </button>

            {/* Hide/Show All Toggle Button */}
            <button
              onClick={() => {
                if (isHiddenMode()) {
                  showAll();
                } else {
                  if (window.confirm('Скрыть все объекты? Вы сможете добавить их через поиск.')) {
                    hideAll();
                  }
                }
              }}
              style={{
                background: isHiddenMode() ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                border: `1px solid ${isHiddenMode() ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255,255,255,0.3)'}`,
                borderRadius: 4,
                color: '#fff',
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                transition: 'all 0.2s',
              }}
              title={isHiddenMode() ? 'Показать весь граф' : 'Скрыть все для расследования'}
            >
              <span>{isHiddenMode() ? '👁' : '🙈'}</span>
              {isHiddenMode() ? 'Показать все' : 'Скрыть все'}
            </button>
          </div>
        </div>

        {/* Modals */}
        <AddObjectModal
          open={addObjectOpen || !!editNode}
          onClose={() => {
            setAddObjectOpen(false);
            setEditNode(null);
          }}
          onCreate={addObject}
          onEdit={updateObject}
          objectTypes={objectTypes}
          editData={
            editNode
              ? {
                id: editNode.id,
                name: editNode.name,
                objectTypeId: editNode.objectTypeId,
                properties: (() => {
                  // Обработка свойств: поддержка старого формата (Key/Value) и нового (key/value)
                  if (!editNode.properties) return {};

                  if (Array.isArray(editNode.properties)) {
                    return editNode.properties.reduce((acc: any, p: any) => {
                      const key = p.key || p.Key;
                      const value = p.value || p.Value;
                      if (key) acc[key] = value || '';
                      return acc;
                    }, {});
                  }

                  if (typeof editNode.properties === 'object') {
                    return editNode.properties;
                  }

                  return {};
                })(),
                color: editNode.color,
                icon: editNode.icon,
              }
              : undefined
          }
        />

        <AddRelationModal
          open={addRelationOpen || !!editEdge}
          onClose={() => {
            setAddRelation({ source: null, target: null });
            setAddRelationOpen(false);
            setEditEdge(null);
          }}
          onCreate={handleAddRelationSubmit}
          onEdit={updateRelation}
          relationTypes={filteredRelationTypes}
          sourceId={addRelation.source?.id || (editEdge ? editEdge.source : 0)}
          targetId={addRelation.target?.id || (editEdge ? editEdge.target : 0)}
          editData={
            editEdge
              ? {
                id: editEdge.id,
                relationTypeId: editEdge.relationTypeId,
                properties: (() => {
                  // Обработка свойств: поддержка старого формата (Key/Value) и нового (key/value)
                  if (!editEdge.properties) return {};

                  if (Array.isArray(editEdge.properties)) {
                    return editEdge.properties.reduce((acc: any, p: any) => {
                      const key = p.key || p.Key;
                      const value = p.value || p.Value;
                      if (key) acc[key] = value || '';
                      return acc;
                    }, {});
                  }

                  if (typeof editEdge.properties === 'object') {
                    return editEdge.properties;
                  }

                  return {};
                })(),
              }
              : undefined
          }
        />

        <AddObjectTypeModal
          open={addObjectTypeOpen}
          onClose={() => setAddObjectTypeOpen(false)}
          onCreate={addObjectType}
        />

        <AddRelationTypeModal
          open={addRelationTypeOpen}
          onClose={() => setAddRelationTypeOpen(false)}
          onCreate={addRelationType}
          objectTypes={objectTypes}
        />

        <FilterModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          objectTypes={objectTypes}
          relationTypes={relationTypes}
          onApplyFilter={applyFilters}
          currentFilters={filters}
        />

        <BulkActionsPanel
          selectedCount={selectedIds.length}
          onDelete={handleBulkDelete}
          onChangeType={() => setBulkChangeTypeOpen(true)}
          onClearSelection={clearSelection}
          onFindCommonNeighbors={handleFindCommonNeighbors}
        />

        <BulkChangeTypeModal
          open={bulkChangeTypeOpen}
          onClose={() => setBulkChangeTypeOpen(false)}
          onConfirm={handleBulkChangeType}
          objectTypes={objectTypes}
          selectedCount={selectedIds.length}
        />

        {historyPanelOpen && (
          <HistoryPanel
            history={history}
            currentIndex={currentIndex}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onClose={() => setHistoryPanelOpen(false)}
          />
        )}

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {/* Search Panel */}
        {searchPanelOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '400px',
              height: '100vh',
              zIndex: 1000,
              boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <SearchPanel
              onClose={() => setSearchPanelOpen(false)}
              onObjectSelect={async objectId => {
                const node = nodes.find(n => n.id === objectId);
                if (node) {
                  handleSelectNode(node);
                  clearSelection();
                } else {
                  // Node not on graph - add it via addNodeToView
                  const addedNode = await addNodeToView(objectId);
                  if (addedNode) {
                    handleSelectNode(addedNode);
                  }
                }
                setSearchPanelOpen(false);
              }}
              onRelationSelect={relationId => {
                const relation = edges.find(e => e.id === relationId);
                if (relation) {
                  setSelected({ type: 'edge', data: relation });
                }
              }}
              onHighlightResults={(objectIds, relationIds) => {
                // Подсветка найденных элементов
                clearSelection();
                objectIds.forEach(id => toggleSelection(id, true));
              }}
            />
          </div>
        )}

        {analyticsOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '420px',
              height: '100vh',
              zIndex: 1000,
              boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
              background: '#fff',
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <button
                onClick={() => setAnalyticsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <AnalyticsDashboard nodes={nodes} />
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 18px',
  fontSize: 17,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s',
};
