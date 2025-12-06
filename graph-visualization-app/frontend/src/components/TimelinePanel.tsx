import React, { useMemo, useCallback } from 'react';
import { DateRange, TimelineDataPoint, TimelineStats, ZoomLevel } from '../hooks/useTimelineFilter';

interface TimelinePanelProps {
    histogramData: TimelineDataPoint[];
    dateBoundaries: { min: Date | null; max: Date | null };
    dateRange: DateRange;
    onDateRangeChange: (range: DateRange) => void;
    isEnabled: boolean;
    onToggleFilter: () => void;
    onClose: () => void;
    stats: TimelineStats;
    zoomLevel: ZoomLevel;
    onZoomChange: (zoom: ZoomLevel) => void;
    selectedProperties?: string[];
}

const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

const parseInputDate = (value: string): Date | null => {
    const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
    histogramData,
    dateBoundaries,
    dateRange,
    onDateRangeChange,
    isEnabled,
    onToggleFilter,
    onClose,
    stats,
    zoomLevel,
    onZoomChange,
    selectedProperties
}) => {
    const maxCount = useMemo(() => {
        if (histogramData.length === 0) return 1;
        return Math.max(...histogramData.map(d => d.count));
    }, [histogramData]);

    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const date = parseInputDate(e.target.value);
        onDateRangeChange({ ...dateRange, start: date });
    }, [dateRange, onDateRangeChange]);

    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const date = parseInputDate(e.target.value);
        onDateRangeChange({ ...dateRange, end: date });
    }, [dateRange, onDateRangeChange]);

    const handleBarClick = useCallback((dataPoint: TimelineDataPoint) => {
        onDateRangeChange({
            start: dataPoint.date,
            end: dataPoint.date
        });
    }, [onDateRangeChange]);

    const resetRange = useCallback(() => {
        onDateRangeChange({
            start: dateBoundaries.min,
            end: dateBoundaries.max
        });
    }, [dateBoundaries, onDateRangeChange]);

    if (histogramData.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.title}>TIMELINE</span>
                    <span style={styles.noData}>Нет данных с датами. Добавьте свойство date к объектам или связям.</span>
                    <button onClick={onClose} style={styles.closeBtn} title="Закрыть">✕</button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header Row */}
            <div style={styles.header}>
                <div style={styles.leftSection}>
                    <button
                        onClick={onToggleFilter}
                        style={{
                            ...styles.toggleBtn,
                            background: isEnabled ? '#E3F2FD' : '#f5f5f5',
                            border: isEnabled ? '1px solid #2196f3' : '1px solid #e0e0e0',
                            color: isEnabled ? '#1976d2' : '#757575',
                        }}
                        title={isEnabled ? 'Фильтр включён' : 'Фильтр выключен'}
                    >
                        <span style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: isEnabled ? '#2196f3' : '#bdbdbd',
                            marginRight: '8px',
                            boxShadow: isEnabled ? '0 0 4px rgba(33, 150, 243, 0.4)' : 'none',
                            transition: 'all 0.3s ease'
                        }} />
                        {isEnabled ? 'Фильтр активен' : 'Фильтр выключен'}
                    </button>
                    <div style={styles.divider} />
                    <span style={styles.title}>TIMELINE</span>
                    {selectedProperties && selectedProperties.length > 0 && (
                        <span style={styles.properties}>
                            {selectedProperties.join(', ')}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    style={styles.closeBtn}
                    title="Закрыть"
                >
                    ✕
                </button>
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>
                {/* Histogram */}
                <div style={styles.histogramSection}>
                    <div style={styles.histogram}>
                        {histogramData.map((dataPoint, index) => {
                            const height = (dataPoint.count / maxCount) * 100;
                            const isInRange = isEnabled && dateRange.start && dateRange.end
                                ? dataPoint.date >= dateRange.start && dataPoint.date <= dateRange.end
                                : true;

                            return (
                                <div
                                    key={index}
                                    style={styles.barWrapper}
                                    title={`${dataPoint.label}: ${dataPoint.count} (${dataPoint.nodeCount} узлов, ${dataPoint.edgeCount} связей)`}
                                    onClick={() => handleBarClick(dataPoint)}
                                >
                                    <div
                                        style={{
                                            ...styles.bar,
                                            height: `${height}%`,
                                            background: isInRange ? '#2196f3' : '#e0e0e0',
                                            opacity: isInRange ? 1 : 0.5
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Axis Labels */}
                    <div style={styles.axisLabels}>
                        {histogramData.length > 0 && (
                            <>
                                <span>{histogramData[0]?.label}</span>
                                {histogramData.length > 2 && <span style={{ flex: 1 }} />}
                                <span>{histogramData[histogramData.length - 1]?.label}</span>
                            </>
                        )}
                    </div>

                    {/* Controls Row */}
                    <div style={styles.controlsRow}>
                        <div style={styles.dateInputs}>
                            <label style={styles.dateLabel}>От:</label>
                            <input
                                type="text"
                                placeholder="DD.MM.YYYY"
                                value={formatDate(dateRange.start)}
                                onChange={handleStartDateChange}
                                style={styles.dateInput}
                            />
                            <label style={styles.dateLabel}>До:</label>
                            <input
                                type="text"
                                placeholder="DD.MM.YYYY"
                                value={formatDate(dateRange.end)}
                                onChange={handleEndDateChange}
                                style={styles.dateInput}
                            />
                            <button onClick={resetRange} style={styles.resetBtn} title="Сбросить диапазон">
                                ↻
                            </button>
                        </div>

                        <div style={styles.zoomSection}>
                            <label style={styles.zoomLabel}>Масштаб:</label>
                            <select
                                value={zoomLevel}
                                onChange={(e) => onZoomChange(e.target.value as ZoomLevel)}
                                style={styles.zoomSelect}
                            >
                                <option value="day">День</option>
                                <option value="month">Месяц</option>
                                <option value="year">Год</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Statistics Panel */}
                <div style={styles.statsPanel}>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Всего объектов</span>
                        <span style={styles.statValue}>{stats.totalEntities}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Некорректные даты</span>
                        <span style={{ ...styles.statValue, color: stats.invalidValues > 0 ? '#f44336' : '#999' }}>
                            {stats.invalidValues}
                        </span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Без даты</span>
                        <span style={{ ...styles.statValue, color: stats.missingValues > 0 ? '#ff9800' : '#999' }}>
                            {stats.missingValues}
                        </span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Видимые</span>
                        <span style={{ ...styles.statValue, color: '#4caf50', fontWeight: 600 }}>
                            {stats.visibleEntities}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '12px 16px',
        minHeight: '100px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    },
    leftSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    title: {
        fontWeight: 700,
        fontSize: '13px',
        color: '#333',
        letterSpacing: '0.5px'
    },
    properties: {
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#666',
        padding: '4px'
    },
    noData: {
        fontSize: '12px',
        color: '#999',
        marginLeft: '8px'
    },
    mainContent: {
        display: 'flex',
        gap: '24px'
    },
    histogramSection: {
        flex: 1
    },
    histogram: {
        display: 'flex',
        alignItems: 'flex-end',
        height: '60px',
        gap: '2px',
        background: '#f5f5f5',
        borderRadius: '4px',
        padding: '8px 4px'
    },
    barWrapper: {
        flex: 1,
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        cursor: 'pointer',
        minWidth: '4px',
        maxWidth: '40px'
    },
    bar: {
        width: '100%',
        borderRadius: '2px 2px 0 0',
        transition: 'all 0.2s',
        minHeight: '2px'
    },
    axisLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#666',
        marginTop: '4px',
        padding: '0 4px'
    },
    divider: {
        width: '1px',
        height: '24px',
        background: '#e0e0e0',
        margin: '0 16px'
    },
    controlsRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '12px'
    },
    dateInputs: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    dateLabel: {
        fontSize: '12px',
        color: '#666'
    },
    dateInput: {
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '12px',
        width: '100px'
    },
    resetBtn: {
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '14px',
        cursor: 'pointer'
    },
    zoomSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    zoomLabel: {
        fontSize: '12px',
        color: '#666'
    },
    zoomSelect: {
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '12px',
        cursor: 'pointer',
        background: '#fff'
    },
    statsPanel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '140px',
        borderLeft: '1px solid #e0e0e0',
        paddingLeft: '16px'
    },
    statItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statLabel: {
        fontSize: '12px',
        color: '#666'
    },
    statValue: {
        fontSize: '13px',
        color: '#333',
        fontWeight: 500
    }
};

export default TimelinePanel;

