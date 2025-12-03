const CONFIG = {
    // Настройки логирования
    DEBUG: false, // Включить подробное логирование для отладки (true = все логи, false = только ошибки и предупреждения)
    VERBOSE_LOGGING: false, // Включить подробное логирование парсинга (true = все логи парсинга, false = только основные)
    
    // Информация о сотруднике
    EMPLOYEE_POSITION: 'PM',
    EMPLOYEE_NAME: 'Апалишин Марк',
    RESPONSIBILITY_AREAS: 'Alt-методы, реклама',
};

// Экспортируем конфигурацию
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
