/**
 * Конфигурация бейджа встреч CloudPayments
 * 
 * Для изменения календаря:
 * 1. Откройте ваш Google Calendar
 * 2. Перейдите в "Настройки и доступ" → "Интеграция календаря"
 * 3. Скопируйте "Секретный адрес в формате iCal"
 * 4. Вставьте ссылку в CALENDAR_URL ниже
 * 5. Сохраните файл
 */

const CONFIG = {
    // Ссылка на Google Calendar в формате iCal
    CALENDAR_URL: 'https://calendar.google.com/calendar/ical/a94fd18710fba31c468c5bb408b8f9895994fee34f76dc38fe053834daaff590%40group.calendar.google.com/private-44dfd0ef1af07d1b29e7b892de3bc009/basic.ics',
    
    // Настройки обновления (в миллисекундах)
    TIMER_INTERVAL: 1000,        // Обновление таймера каждую секунду
    CALENDAR_INTERVAL: 30000,    // Обновление календаря каждые 30 секунд
    OBS_REFRESH_INTERVAL: 30000, // Обновление OBS каждые 30 секунд
    
    // Настройки обновления информации о сотруднике
    EMPLOYEE_INFO_AUTO_UPDATE: false, // Автообновление информации о сотруднике (false = только при загрузке)
    
    // Настройки логирования
    DEBUG: false, // Включить подробное логирование для отладки (true = все логи, false = только ошибки и предупреждения)
    VERBOSE_LOGGING: false, // Включить подробное логирование парсинга (true = все логи парсинга, false = только основные)
    
    // Настройки отображения
    WARNING_TIME: 5 * 60 * 1000, // Предупреждение за 5 минут до конца встречи
    
    // Цвета
    PRIMARY_COLOR: '#0037C0',     // Основной синий цвет
    WARNING_COLOR: '#FF9800',    // Цвет предупреждения
    OVERDUE_COLOR: '#f44336',    // Цвет просроченных встреч
    
    // Размеры
    BADGE_WIDTH: 666,
    BADGE_HEIGHT: 170,
    BORDER_RADIUS: 30,
    
    // Информация о сотруднике
    EMPLOYEE_POSITION: 'PM',
    EMPLOYEE_NAME: 'Апалишин Марк',
    RESPONSIBILITY_AREAS: 'Alt-методы, реклама',
    
    // Настройки новых бейджей
    BADGE_SPACING: 30,           // Отступ между бейджами
    POSITION_FONT_SIZE: 40,      // Размер шрифта должности
    NAME_FONT_SIZE: 40,          // Размер шрифта ФИО
    RESPONSIBILITY_FONT_SIZE: 40 // Размер шрифта зон ответственности
};

// Доп. настройки сетевых запросов и прокси
CONFIG.PROXY_URLS = [
    // Публичные прокси для DEV/локальной проверки. Для PROD рекомендуется пустой список и DIRECT_CALENDAR_ENDPOINT.
    'https://api.allorigins.win/raw?url={ENCODED_URL}',
    'https://thingproxy.freeboard.io/fetch/{ENCODED_URL}'
];
CONFIG.PROXY_TIMEOUT = 10000; // мс, таймаут для запросов через прокси

// Опционально: прямой CORS-совместимый эндпоинт, если доступен в вашей инфраструктуре
// Например, корпоративный прокси/шлюз, который берёт URL календаря и возвращает ics с правильными CORS заголовками
// Пример: 'https://your-domain.example.com/ical?url='
CONFIG.DIRECT_CALENDAR_ENDPOINT = '';
CONFIG.DIRECT_REQUEST_TIMEOUT = 8000; // мс, таймаут для прямого запроса

// Настройки генерации повторяющихся событий
// Используется как количество дней вперёд для развёртки RRULE-событий
CONFIG.RECURRENCE_WINDOW_DAYS = 7;

// Экспортируем конфигурацию
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
