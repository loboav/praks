import { useState, useMemo, useCallback } from 'react';
import { GraphRelation } from '../types/graph';

// Ключи свойств, которые считаются временными
const DATE_PROPERTY_KEYS = [
    'date', 'datetime', 'timestamp', 'time', 'created_at',
    'дата', 'время', 'создано', 'дата_создания'
];

// Форматы дат для парсинга (приоритет: DD.MM.YYYY)
const DATE_FORMATS = [
    /^(\d{2})\.(\d{2})\.(\d{4})$/,           // DD.MM.YYYY
    /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/, // DD.MM.YYYY HH:mm
    /^(\d{4})-(\d{2})-(\d{2})$/,             // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/,           // DD/MM/YYYY
];

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface TimelineDataPoint {
    date: Date;
    count: number;
}

const isDatePropertyKey = (key: string): boolean => {
    const lowerKey = key.toLowerCase().replace(/[_-]/g, '');
    return DATE_PROPERTY_KEYS.some(dk =>
        lowerKey === dk.replace(/[_-]/g, '') || lowerKey.includes(dk.replace(/[_-]/g, ''))
    );
};

const parseDate = (value: string): Date | null => {
    if (!value) return null;

    // Пробуем DD.MM.YYYY
    const ddmmyyyy = value.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
    }

    // Пробуем YYYY-MM-DD
    const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
    }

    // Пробуем Unix timestamp
    const timestamp = parseInt(value);
    if (!isNaN(timestamp) && timestamp > 1000000000) {
        // Миллисекунды или секунды
        const ts = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
        return new Date(ts);
    }

    // Общий парсинг
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const getDateFromProperties = (properties: Record<string, string>): Date | null => {
    if (!properties) return null;

    for (const [key, value] of Object.entries(properties)) {
        if (isDatePropertyKey(key)) {
            const date = parseDate(String(value));
            if (date) return date;
        }
    }
    return null;
};

interface UseTimelineFilterProps {
    edges: GraphRelation[];
}

export const useTimelineFilter = ({ edges }: UseTimelineFilterProps) => {
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const [isTimelineEnabled, setIsTimelineEnabled] = useState(false);

    // Извлекаем даты из всех связей
    const edgesWithDates = useMemo(() => {
        return edges
            .map(edge => ({
                edge,
                date: getDateFromProperties(edge.properties)
            }))
            .filter((item): item is { edge: GraphRelation; date: Date } => item.date !== null);
    }, [edges]);

    // Вычисляем границы дат
    const dateBoundaries = useMemo(() => {
        if (edgesWithDates.length === 0) return { min: null, max: null };

        const dates = edgesWithDates.map(e => e.date.getTime());
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    }, [edgesWithDates]);

    // Группируем по дням для гистограммы
    const histogramData = useMemo((): TimelineDataPoint[] => {
        const groups = new Map<string, number>();

        for (const { date } of edgesWithDates) {
            // Используем локальные компоненты даты для ключа, чтобы избежать сдвига часовых поясов
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${day}`;

            groups.set(key, (groups.get(key) || 0) + 1);
        }

        return Array.from(groups.entries())
            .map(([dateStr, count]) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                return {
                    date: new Date(y, m - 1, d), // Создаем дату в локальном времени 00:00:00
                    count
                };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [edgesWithDates]);

    // Фильтруем связи по диапазону
    const filteredEdgeIds = useMemo(() => {
        // Если Timeline выключен или диапазон не выбран — вернём все edge IDs
        if (!isTimelineEnabled || (!dateRange.start && !dateRange.end)) {
            return new Set<number>(edgesWithDates.map(e => e.edge.id));
        }

        const filtered = new Set<number>();

        // Нормализуем границы к началу и концу дня
        const startOfDay = dateRange.start
            ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate(), 0, 0, 0, 0).getTime()
            : -Infinity;
        const endOfDay = dateRange.end
            ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999).getTime()
            : Infinity;

        for (const { edge, date } of edgesWithDates) {
            const time = date.getTime();

            if (time >= startOfDay && time <= endOfDay) {
                filtered.add(edge.id);
            }
        }

        return filtered;
    }, [edgesWithDates, dateRange, isTimelineEnabled]);

    const filterEdgesByTimeline = useCallback((edgesToFilter: GraphRelation[]): GraphRelation[] => {
        // Если Timeline выключен — показать все
        if (!isTimelineEnabled) {
            return edgesToFilter;
        }
        // Если Timeline включён — показать только совпадающие (даже если их 0)
        return edgesToFilter.filter(edge => filteredEdgeIds.has(edge.id));
    }, [isTimelineEnabled, filteredEdgeIds]);

    const toggleTimeline = useCallback(() => {
        const wasEnabled = isTimelineEnabled;
        setIsTimelineEnabled(prev => !prev);

        // При включении — если диапазон не выбран, устанавливаем полный
        if (!wasEnabled && !dateRange.start && !dateRange.end) {
            setDateRange({
                start: dateBoundaries.min,
                end: dateBoundaries.max
            });
        }
        // При включении с уже выбранным диапазоном — НЕ сбрасываем!
    }, [isTimelineEnabled, dateBoundaries, dateRange]);

    return {
        dateRange,
        setDateRange,
        isTimelineEnabled,
        toggleTimeline,
        histogramData,
        dateBoundaries,
        edgesWithDatesCount: edgesWithDates.length,
        filterEdgesByTimeline,
        filteredEdgeIds
    };
};
