const API_BASE = (window as any).__API_BASE || 'http://localhost:5000/api';

export const exportGraph = async (format: 'json' | 'graphml' | 'csv') => {
  try {
    const response = await fetch(`${API_BASE}/export/${format}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Получаем имя файла из заголовка Content-Disposition или генерируем
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `graph_${Date.now()}.${format}`;
    
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches && matches[1]) {
        fileName = matches[1].replace(/['"]/g, '');
      }
    }
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
