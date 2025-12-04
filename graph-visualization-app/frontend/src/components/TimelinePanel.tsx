import React, { useMemo, useCallback } from 'react';
import { DateRange, TimelineDataPoint } from '../hooks/useTimelineFilter';

interface TimelinePanelProps {
    histogramData: TimelineDataPoint[];
    dateBoundaries: { min: Date | null; max: Date | null };
    dateRange: DateRange;
    onDateRangeChange: (range: DateRange) => void;
    isEnabled: boolean;
    onToggle: () => void;
    edgesWithDatesCount: number;
    totalEdgesCount: number;
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
    onToggle,
    edgesWithDatesCount,
    totalEdgesCount
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
        // Клик по бару — установить этот день как диапазон
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
                    <span style={styles.title}>📅 Timeline</span>
                    <span style={styles.noData}>Нет данных с датами. Добавьте свойство "date" к связям.</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.leftSection}>
                    <button
                        onClick={onToggle}
                        style={{
                            ...styles.toggleBtn,
                            background: isEnabled ? '#4caf50' : '#e0e0e0',
                            color: isEnabled ? '#fff' : '#666'
                        }}
                    >
                        {isEnabled ? '✓ Активно' : '○ Выкл'}
                    </button>
                    <span style={styles.title}>📅 Timeline</span>
                    <span style={styles.stats}>
                        {edgesWithDatesCount} из {totalEdgesCount} связей с датами
                    </span>
                </div>

                <div style={styles.rightSection}>
                    <div style={styles.dateInputGroup}>
                        <label style={styles.dateLabel}>От:</label>
                        <input
                            type="text"
                            placeholder="DD.MM.YYYY"
                            value={formatDate(dateRange.start)}
                            onChange={handleStartDateChange}
                            style={styles.dateInput}
                        />
                    </div>
                    <div style={styles.dateInputGroup}>
                        <label style={styles.dateLabel}>До:</label>
                        <input
                            type="text"
                            placeholder="DD.MM.YYYY"
                            value={formatDate(dateRange.end)}
                            onChange={handleEndDateChange}
                            style={styles.dateInput}
                        />
                    </div>
                    <button onClick={resetRange} style={styles.resetBtn}>
                        ↻ Сброс
                    </button>
                </div>
            </div>

            <div style={styles.histogramContainer}>
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
                                title={`${formatDate(dataPoint.date)}: ${dataPoint.count} событий`}
                                onClick={() => handleBarClick(dataPoint)}
                            >
                                <div
                                    style={{
                                        ...styles.bar,
                                        height: `${height}%`,
                                        background: isInRange ? '#2196f3' : '#ccc',
                                        opacity: isInRange ? 1 : 0.4
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div style={styles.axisLabels}>
                    <span>{formatDate(dateBoundaries.min)}</span>
                    <span>{formatDate(dateBoundaries.max)}</span>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '8px 16px',
        minHeight: '80px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    leftSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    rightSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    toggleBtn: {
        border: 'none',
        borderRadius: '4px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    title: {
        fontWeight: 600,
        fontSize: '14px',
        color: '#333'
    },
    stats: {
        fontSize: '12px',
        color: '#888'
    },
    noData: {
        fontSize: '12px',
        color: '#999',
        marginLeft: '8px'
    },
    dateInputGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    dateLabel: {
        fontSize: '12px',
        color: '#666'
    },
    dateInput: {
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '12px',
        width: '90px'
    },
    resetBtn: {
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '12px',
        cursor: 'pointer'
    },
    histogramContainer: {
        position: 'relative'
    },
    histogram: {
        display: 'flex',
        alignItems: 'flex-end',
        height: '40px',
        gap: '1px',
        background: '#f9f9f9',
        borderRadius: '4px',
        padding: '4px'
    },
    barWrapper: {
        flex: 1,
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        cursor: 'pointer',
        minWidth: '2px'
    },
    bar: {
        width: '100%',
        borderRadius: '2px 2px 0 0',
        transition: 'all 0.2s'
    },
    axisLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#999',
        marginTop: '4px'
    }
};

export default TimelinePanel;
