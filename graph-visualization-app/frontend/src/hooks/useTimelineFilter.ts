import { useState, useMemo, useCallback } from 'react';
import { GraphRelation, GraphObject } from '../types/graph';

// Keys considered as date properties
const DATE_PROPERTY_KEYS = [
    'date', 'datetime', 'timestamp', 'time', 'created_at',
    'openingdate', 'closedate', 'birthdate', 'startdate', 'enddate',
    'дата', 'время', 'создано', 'дата_создания'
];

export type ZoomLevel = 'day' | 'month' | 'year';

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface TimelineDataPoint {
    date: Date;
    label: string;
    count: number;
    nodeCount: number;
    edgeCount: number;
}

export interface TimelineStats {
    totalEntities: number;
    invalidValues: number;
    missingValues: number;
    visibleEntities: number;
}

const isDatePropertyKey = (key: string): boolean => {
    const lowerKey = key.toLowerCase().replace(/[_-]/g, '');
    return DATE_PROPERTY_KEYS.some(dk =>
        lowerKey === dk.replace(/[_-]/g, '') || lowerKey.includes(dk.replace(/[_-]/g, ''))
    );
};

const parseDate = (value: string): Date | null => {
    if (!value) return null;

    // Try DD.MM.YYYY
    const ddmmyyyy = value.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
    }

    // Try YYYY-MM-DD
    const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
    }

    // Try Unix timestamp
    const timestamp = parseInt(value);
    if (!isNaN(timestamp) && timestamp > 1000000000) {
        const ts = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
        return new Date(ts);
    }

    // General parsing
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const getDateFromProperties = (properties: Record<string, string> | undefined): { date: Date | null; isValid: boolean } => {
    if (!properties) return { date: null, isValid: false };

    for (const [key, value] of Object.entries(properties)) {
        if (isDatePropertyKey(key)) {
            const date = parseDate(String(value));
            if (date) return { date, isValid: true };
            // Has date property but invalid value
            return { date: null, isValid: false };
        }
    }
    // No date property found
    return { date: null, isValid: true };
};

interface UseTimelineFilterProps {
    edges: GraphRelation[];
    nodes: GraphObject[];
}

export const useTimelineFilter = ({ edges, nodes }: UseTimelineFilterProps) => {
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const [isTimelineEnabled, setIsTimelineEnabled] = useState(false);
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');

    // Extract dates from all items (nodes + edges)
    const itemsWithDates = useMemo(() => {
        const items: Array<{ id: number; type: 'node' | 'edge'; date: Date }> = [];
        let invalidCount = 0;
        let missingCount = 0;

        // Process nodes
        nodes.forEach(node => {
            const { date, isValid } = getDateFromProperties(node.properties);
            if (date) {
                items.push({ id: node.id, type: 'node', date });
            } else if (!isValid) {
                invalidCount++;
            } else {
                missingCount++;
            }
        });

        // Process edges
        edges.forEach(edge => {
            const { date, isValid } = getDateFromProperties(edge.properties);
            if (date) {
                items.push({ id: edge.id, type: 'edge', date });
            } else if (!isValid) {
                invalidCount++;
            } else {
                missingCount++;
            }
        });

        return { items, invalidCount, missingCount };
    }, [nodes, edges]);

    // Calculate date boundaries
    const dateBoundaries = useMemo(() => {
        if (itemsWithDates.items.length === 0) return { min: null, max: null };

        const dates = itemsWithDates.items.map(e => e.date.getTime());
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    }, [itemsWithDates]);

    // Generate date key based on zoom level
    const getDateKey = useCallback((date: Date, zoom: ZoomLevel): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (zoom) {
            case 'day': return `${year}-${month}-${day}`;
            case 'month': return `${year}-${month}`;
            case 'year': return `${year}`;
        }
    }, []);

    // Generate label for histogram bar
    const getDateLabel = useCallback((dateStr: string, zoom: ZoomLevel): string => {
        const parts = dateStr.split('-').map(Number);
        switch (zoom) {
            case 'day': return `${parts[2]}.${parts[1]}.${parts[0]}`;
            case 'month': {
                const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                return `${months[parts[1] - 1]} ${parts[0]}`;
            }
            case 'year': return String(parts[0]);
        }
    }, []);

    // Parse date key back to Date
    const parseDateKey = useCallback((dateStr: string, zoom: ZoomLevel): Date => {
        const parts = dateStr.split('-').map(Number);
        switch (zoom) {
            case 'day': return new Date(parts[0], parts[1] - 1, parts[2]);
            case 'month': return new Date(parts[0], parts[1] - 1, 1);
            case 'year': return new Date(parts[0], 0, 1);
        }
    }, []);

    // Group by zoom level for histogram
    const histogramData = useMemo((): TimelineDataPoint[] => {
        const groups = new Map<string, { nodeCount: number; edgeCount: number }>();

        for (const { date, type } of itemsWithDates.items) {
            const key = getDateKey(date, zoomLevel);
            const current = groups.get(key) || { nodeCount: 0, edgeCount: 0 };
            if (type === 'node') current.nodeCount++;
            else current.edgeCount++;
            groups.set(key, current);
        }

        return Array.from(groups.entries())
            .map(([dateStr, counts]) => ({
                date: parseDateKey(dateStr, zoomLevel),
                label: getDateLabel(dateStr, zoomLevel),
                count: counts.nodeCount + counts.edgeCount,
                nodeCount: counts.nodeCount,
                edgeCount: counts.edgeCount
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [itemsWithDates, zoomLevel, getDateKey, getDateLabel, parseDateKey]);

    // Filter items by date range
    const filteredItemIds = useMemo(() => {
        const nodeIds = new Set<number>();
        const edgeIds = new Set<number>();

        if (!isTimelineEnabled || (!dateRange.start && !dateRange.end)) {
            itemsWithDates.items.forEach(item => {
                if (item.type === 'node') nodeIds.add(item.id);
                else edgeIds.add(item.id);
            });
            return { nodeIds, edgeIds, visibleCount: itemsWithDates.items.length };
        }

        const start = dateRange.start;
        const end = dateRange.end;

        const checkDate = (date: Date): boolean => {
            if (!start || !end) return true;

            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();

            if (zoomLevel === 'year') {
                // For year view: include everything from start year to end year (inclusive)
                return year >= start.getFullYear() && year <= end.getFullYear();
            } else if (zoomLevel === 'month') {
                // For month view: include everything from start month to end month
                // Convert to total months for easy comparison: year * 12 + month
                const itemMonths = year * 12 + month;
                const startMonths = start.getFullYear() * 12 + start.getMonth();
                const endMonths = end.getFullYear() * 12 + end.getMonth();
                return itemMonths >= startMonths && itemMonths <= endMonths;
            } else {
                // Day view: exact timestamp comparison
                const time = date.getTime();
                // Normalize boundaries to start/end of day
                const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0).getTime();
                const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();
                return time >= startTime && time <= endTime;
            }
        };

        let visibleCount = 0;
        for (const item of itemsWithDates.items) {
            if (checkDate(item.date)) {
                if (item.type === 'node') nodeIds.add(item.id);
                else edgeIds.add(item.id);
                visibleCount++;
            }
        }

        return { nodeIds, edgeIds, visibleCount };
    }, [itemsWithDates, dateRange, isTimelineEnabled, zoomLevel]);

    // Statistics
    const stats = useMemo((): TimelineStats => ({
        totalEntities: itemsWithDates.items.length,
        invalidValues: itemsWithDates.invalidCount,
        missingValues: itemsWithDates.missingCount,
        visibleEntities: filteredItemIds.visibleCount
    }), [itemsWithDates, filteredItemIds]);

    const filterEdgesByTimeline = useCallback((edgesToFilter: GraphRelation[]): GraphRelation[] => {
        if (!isTimelineEnabled) return edgesToFilter;
        return edgesToFilter.filter(edge => filteredItemIds.edgeIds.has(edge.id));
    }, [isTimelineEnabled, filteredItemIds]);

    const filterNodesByTimeline = useCallback((nodesToFilter: GraphObject[]): GraphObject[] => {
        if (!isTimelineEnabled) return nodesToFilter;
        // Keep nodes that are either in filtered set OR have no date property
        return nodesToFilter.filter(node => {
            const { date } = getDateFromProperties(node.properties);
            if (!date) return true; // Keep nodes without dates
            return filteredItemIds.nodeIds.has(node.id);
        });
    }, [isTimelineEnabled, filteredItemIds]);

    const toggleTimeline = useCallback(() => {
        const wasEnabled = isTimelineEnabled;
        setIsTimelineEnabled(prev => !prev);

        if (!wasEnabled && !dateRange.start && !dateRange.end) {
            setDateRange({
                start: dateBoundaries.min,
                end: dateBoundaries.max
            });
        }
    }, [isTimelineEnabled, dateBoundaries, dateRange]);

    return {
        dateRange,
        setDateRange,
        isTimelineEnabled,
        toggleTimeline,
        zoomLevel,
        setZoomLevel,
        histogramData,
        dateBoundaries,
        stats,
        filterEdgesByTimeline,
        filterNodesByTimeline,
        filteredItemIds
    };
};

