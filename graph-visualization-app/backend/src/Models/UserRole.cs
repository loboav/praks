namespace GraphVisualizationApp.Models
{
    public enum UserRole
    {
        Viewer,  // Только просмотр графа, аналитики, экспорт
        Editor,  // Viewer + создание/изменение/удаление объектов и связей
        Admin    // Editor + управление типами объектов/связей, пользователями
    }
}
