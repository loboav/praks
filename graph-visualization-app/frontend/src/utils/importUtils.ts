import { apiClient } from './apiClient';

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  objectsImported?: number;
  relationsImported?: number;
  objectTypesImported?: number;
  relationTypesImported?: number;
}

export const importGraph = async (file: File, format: 'json' | 'graphml'): Promise<ImportResult> => {
  try {
    // Читаем файл
    const text = await file.text();
    
    // Валидация размера
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Файл слишком большой (максимум 10MB)'
      };
    }

    // Валидация формата
    if (format === 'json') {
      try {
        JSON.parse(text);
      } catch {
        return {
          success: false,
          error: 'Неверный формат JSON'
        };
      }
    } else if (format === 'graphml') {
      if (!text.includes('<graphml') && !text.includes('<graph')) {
        return {
          success: false,
          error: 'Неверный формат GraphML'
        };
      }
    }

    // Отправляем запрос на backend
    const endpoint = format === 'json' ? '/api/import/json' : '/api/import/graphml';
    const response = await apiClient.post(endpoint, { data: text });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Ошибка при импорте'
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Неизвестная ошибка при импорте'
    };
  }
};
