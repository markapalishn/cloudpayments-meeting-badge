/**
 * Система логирования для управления выводом отладочной информации
 */
class Logger {
    constructor() {
        this.isDebugEnabled = window.CONFIG && window.CONFIG.DEBUG;
    }
    
    debug(...args) {
        if (this.isDebugEnabled) {
            console.log('[DEBUG]', ...args);
        }
    }
    
    info(...args) {
        console.log('[INFO]', ...args);
    }
    
    warn(...args) {
        console.warn('[WARN]', ...args);
    }
    
    error(...args) {
        console.error('[ERROR]', ...args);
    }
}

// Создаем глобальный экземпляр логгера
const logger = new Logger();

class MeetingTimer {
    constructor() {
        this.currentMeeting = null;
        this.nextMeeting = null;
        this.isConnected = false;
        this.updateInterval = null;
        
        this.initializeElements();
        this.startTimer();
        this.loadMeetings();
        // Инициализируем информацию о сотруднике сразу
        this.updateEmployeeInfo();
    }
    
    initializeElements() {
        this.elements = {
            currentTimer: document.getElementById('currentTimer'),
            nextCountdown: document.getElementById('nextCountdown'),
            meetingTitle: document.querySelector('.meeting-title'),
            employeeInfo: document.getElementById('employeeInfo'),
            positionBadge: document.getElementById('positionBadge'),
            nameBadge: document.getElementById('nameBadge'),
            responsibilityAreas: document.getElementById('responsibilityAreas')
        };
    }
    
    hideBadge() {
        // Показываем логотип компании когда встреч нет
        document.getElementById('meetingBadge').style.display = 'none';
        document.getElementById('companyLogo').style.display = 'flex';
        // Показываем информацию о сотруднике всегда
        this.elements.employeeInfo.style.display = 'flex';
        this.elements.responsibilityAreas.style.display = 'block';
        logger.info('Нет встреч - показываем логотип компании и информацию о сотруднике');
    }
    
    showBadge() {
        // Показываем бейдж с информацией о встречах
        document.getElementById('meetingBadge').style.display = 'flex';
        document.getElementById('companyLogo').style.display = 'none';
        // Показываем информацию о сотруднике
        this.elements.employeeInfo.style.display = 'flex';
        this.elements.responsibilityAreas.style.display = 'block';
        logger.info('Есть встречи - показываем бейдж');
    }
    
    async loadMeetings() {
        try {
            // Загружаем из захардкоженного Google Calendar
            const calendarUrl = this.getGoogleCalendarUrl();
            await this.loadFromPublicCalendar(calendarUrl);
        } catch (error) {
            logger.error('Ошибка загрузки встреч:', error);
            this.hideBadge();
        }
    }
    
    getGoogleCalendarUrl() {
        // Получаем URL календаря из конфигурации
        return window.CONFIG.CALENDAR_URL;
    }
    
    async fetchWithProxy(url) {
        // Список proxy сервисов для обхода CORS
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://thingproxy.freeboard.io/fetch/${url}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`
        ];
        
        for (let i = 0; i < proxies.length; i++) {
            try {
                logger.debug(`Пробуем proxy ${i + 1}/${proxies.length}:`, proxies[i]);
                const response = await fetch(proxies[i]);
                if (response.ok) {
                    logger.debug(`Proxy ${i + 1} успешно загрузил данные`);
                    return response;
                }
            } catch (error) {
                logger.debug(`Proxy ${i + 1} не сработал:`, error.message);
                if (i === proxies.length - 1) {
                    throw new Error(`Все proxy сервисы недоступны. Последняя ошибка: ${error.message}`);
                }
            }
        }
    }
    
    async loadFromPublicCalendar(calendarUrl) {
        try {
            logger.debug('Загружаем календарь из:', calendarUrl);
            
            // Используем proxy для обхода CORS ограничений Google Calendar
            const startTime = Date.now();
            let response;
            
            // Проверяем, является ли это Google Calendar URL
            if (calendarUrl.includes('calendar.google.com')) {
                logger.debug('Используем proxy для Google Calendar...');
                response = await this.fetchWithProxy(calendarUrl);
            } else {
                // Для других календарей пробуем прямой запрос
                try {
                    response = await fetch(calendarUrl);
                } catch (corsError) {
                    logger.debug('CORS блокирует прямой запрос, используем proxy...');
                    response = await this.fetchWithProxy(calendarUrl);
                }
            }
            
            const loadTime = Date.now() - startTime;
            logger.debug(`Запрос выполнен за ${loadTime}ms`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const icalData = await response.text();
            logger.debug('iCal данные загружены, размер:', icalData.length, 'символов');
            
            // Проверяем, не получили ли мы HTML ошибку вместо iCal
            if (icalData.includes('<html') || icalData.includes('Error 404')) {
                logger.error('Получена HTML ошибка вместо iCal данных. Календарь не публичный или не существует.');
                this.hideBadge();
                return;
            }
            
            const events = this.parseICalData(icalData);
            logger.debug('События распарсены:', events.length);
            
            this.processCalendarEvents(events);
            
        } catch (error) {
            logger.error('Ошибка загрузки календаря:', error);
            this.hideBadge();
        }
    }
    
    parseICalData(icalData) {
        const events = [];
        const lines = icalData.split('\n');
        let currentEvent = null;
        
        logger.debug('Начинаем парсинг iCal данных, строк:', lines.length);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
                logger.debug('Начинаем новое событие');
            } else if (line === 'END:VEVENT' && currentEvent) {
                if (currentEvent.summary && currentEvent.start && currentEvent.end) {
                    logger.debug('Добавляем событие:', {
                        summary: currentEvent.summary,
                        start: currentEvent.start,
                        end: currentEvent.end
                    });
                    events.push({
                        summary: currentEvent.summary,
                        start: currentEvent.start,
                        end: currentEvent.end
                    });
                } else {
                    logger.warn('Событие пропущено - неполные данные:', currentEvent);
                }
                currentEvent = null;
            } else if (currentEvent) {
                // Обрабатываем строки с параметрами (например, DTSTART;TZID=Europe/Moscow:20250922T104500)
                const colonIndex = line.indexOf(':');
                if (colonIndex === -1) continue;
                
                const keyPart = line.substring(0, colonIndex);
                const value = line.substring(colonIndex + 1);
                
                // Извлекаем основное имя ключа (до первого ;)
                const key = keyPart.split(';')[0];
                
                switch (key) {
                    case 'SUMMARY':
                        currentEvent.summary = value;
                        break;
                    case 'DTSTART':
                        currentEvent.start = this.parseICalDate(line); // Передаем всю строку для правильного парсинга
                        break;
                    case 'DTEND':
                        currentEvent.end = this.parseICalDate(line); // Передаем всю строку для правильного парсинга
                        break;
                    case 'DESCRIPTION':
                        currentEvent.description = value;
                        break;
                }
            }
        }
        
        return events;
    }
    
    parseICalDate(dateString) {
        logger.debug('Парсим дату:', dateString);
        
        // Парсим дату в формате iCal
        if (dateString.includes('TZID=Europe/Moscow:')) {
            // Формат с часовым поясом: DTSTART;TZID=Europe/Moscow:20250922T104500
            const datePart = dateString.split('TZID=Europe/Moscow:')[1];
            const year = datePart.substring(0, 4);
            const month = datePart.substring(4, 6);
            const day = datePart.substring(6, 8);
            const hour = datePart.substring(9, 11);
            const minute = datePart.substring(11, 13);
            const second = datePart.substring(13, 15);
            
            const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
            logger.debug('Создаем дату (Moscow):', dateStr);
            const result = new Date(dateStr);
            logger.debug('Результат:', result);
            return result;
        } else if (dateString.endsWith('Z')) {
            // Формат UTC: 20250921T180000Z
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            const hour = dateString.substring(9, 11);
            const minute = dateString.substring(11, 13);
            const second = dateString.substring(13, 15);
            
            const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
            logger.debug('Создаем дату (UTC):', dateStr);
            const result = new Date(dateStr);
            logger.debug('Результат:', result);
            return result;
        } else {
            // Простой формат: 20250922T104500
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            const hour = dateString.substring(9, 11);
            const minute = dateString.substring(11, 13);
            const second = dateString.substring(13, 15);
            
            const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
            logger.debug('Создаем дату (простой):', dateStr);
            const result = new Date(dateStr);
            logger.debug('Результат:', result);
            return result;
        }
    }
    
    processCalendarEvents(events) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        logger.debug('Обрабатываем события календаря:', events.length);
        logger.debug('Текущее время:', now.toLocaleString());
        logger.debug('Сегодня:', today.toLocaleDateString());
        logger.debug('Завтра:', tomorrow.toLocaleDateString());
        
        // Фильтруем события на сегодня и завтра
        const relevantEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate >= today && eventDate < tomorrow;
        });
        
        logger.debug('Релевантных событий:', relevantEvents.length);
        
        // Сортируем по времени начала
        relevantEvents.sort((a, b) => a.start - b.start);
        
        // Находим текущую встречу
        this.currentMeeting = relevantEvents.find(event => {
            return event.start <= now && event.end > now;
        });
        
        // Находим следующую встречу
        this.nextMeeting = relevantEvents.find(event => {
            return event.start > now;
        });
        
        logger.debug('Текущая встреча:', this.currentMeeting ? this.currentMeeting.summary : 'нет');
        logger.debug('Следующая встреча:', this.nextMeeting ? this.nextMeeting.summary : 'нет');
        
        // Если нет ни текущей, ни следующей встречи - показываем логотип компании
        if (!this.currentMeeting && !this.nextMeeting) {
            logger.info('Нет встреч - показываем логотип компании');
            this.hideBadge();
            // Обновляем информацию о сотруднике даже когда нет встреч
            this.updateEmployeeInfo();
            return;
        }
        
        logger.info('Есть встречи - показываем бейдж');
        this.updateDisplay();
    }
    
    updateDisplay() {
        // Показываем бейдж, так как есть встречи
        this.showBadge();
        
        // Инициализируем градиент и таймеры
        this.updateTimers();
        
        // Обновляем информацию о сотруднике только при загрузке
        this.updateEmployeeInfo();
        
        // Принудительно обновляем градиент
        setTimeout(() => {
            this.updateTimers();
        }, 100);
    }
    
    updateEmployeeInfo() {
        // Обновляем информацию о сотруднике из конфигурации
        if (this.elements.positionBadge) {
            this.elements.positionBadge.textContent = window.CONFIG.EMPLOYEE_POSITION;
        }
        if (this.elements.nameBadge) {
            this.elements.nameBadge.textContent = window.CONFIG.EMPLOYEE_NAME;
        }
        if (this.elements.responsibilityAreas) {
            this.elements.responsibilityAreas.textContent = window.CONFIG.RESPONSIBILITY_AREAS;
        }
    }
    
    updateTimerOnly() {
        // Обновляем только таймеры, без информации о сотруднике
        this.updateTimers();
    }
    
    startTimer() {
        // Обновление таймера каждую секунду
        this.updateInterval = setInterval(() => {
            this.updateTimers();
        }, window.CONFIG.TIMER_INTERVAL);
        
        // Обновление данных о встречах каждые 30 секунд
        this.calendarUpdateInterval = setInterval(() => {
            logger.debug('Обновляем данные календаря...');
            this.loadMeetings();
        }, window.CONFIG.CALENDAR_INTERVAL);
        
        // Принудительное обновление для OBS каждые 30 секунд
        this.obsRefreshInterval = setInterval(() => {
            logger.debug('Принудительное обновление для OBS...');
            this.forceOBSRefresh();
        }, window.CONFIG.OBS_REFRESH_INTERVAL);
        
        // Обновление только таймера каждые 30 секунд (если включено)
        if (window.CONFIG.EMPLOYEE_INFO_AUTO_UPDATE) {
            this.employeeInfoUpdateInterval = setInterval(() => {
                logger.debug('Обновляем информацию о сотруднике...');
                this.updateEmployeeInfo();
            }, window.CONFIG.CALENDAR_INTERVAL);
        }
    }
    
    stopTimer() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.calendarUpdateInterval) {
            clearInterval(this.calendarUpdateInterval);
            this.calendarUpdateInterval = null;
        }
        if (this.obsRefreshInterval) {
            clearInterval(this.obsRefreshInterval);
            this.obsRefreshInterval = null;
        }
        if (this.employeeInfoUpdateInterval) {
            clearInterval(this.employeeInfoUpdateInterval);
            this.employeeInfoUpdateInterval = null;
        }
    }
    
    // Принудительное обновление календаря
    refreshCalendar() {
        logger.info('Принудительное обновление календаря...');
        this.loadMeetings();
    }
    
    // Умное обновление - проверяет изменения перед обновлением
    smartRefresh() {
        const now = new Date();
        const lastUpdate = this.lastCalendarUpdate || 0;
        const timeSinceUpdate = now - lastUpdate;
        
        // Обновляем только если прошло больше 10 секунд с последнего обновления
        if (timeSinceUpdate > 10000) {
            logger.debug('Умное обновление календаря...');
            this.lastCalendarUpdate = now;
            this.loadMeetings();
        } else {
            logger.debug('Пропускаем обновление - слишком рано');
        }
    }
    
    // Принудительное обновление для OBS
    forceOBSRefresh() {
        // Обновляем календарь
        this.loadMeetings();
        
        // Принудительно обновляем отображение
        this.updateDisplay();
        
        // Добавляем небольшое изменение в DOM для принудительного обновления
        const badge = document.getElementById('meetingBadge');
        if (badge) {
            badge.style.transform = 'scale(1.001)';
            setTimeout(() => {
                badge.style.transform = 'scale(1)';
            }, 10);
        }
        
        logger.debug('OBS принудительно обновлен');
    }
    
    updateTimers() {
        const now = new Date();
        
        // Обновляем таймер текущей встречи
        if (this.currentMeeting) {
            const remaining = this.currentMeeting.end - now;
            const totalDuration = this.currentMeeting.end - this.currentMeeting.start;
            
            // Обновляем заголовок
            this.elements.meetingTitle.textContent = 'Конец через';
            
            if (remaining > 0) {
                // Показываем оставшееся время до конца встречи
                this.elements.currentTimer.textContent = this.formatTimeRemaining(remaining);
                this.elements.currentTimer.className = 'timer';
                
                // Предупреждение за заданное время до конца
                if (remaining < window.CONFIG.WARNING_TIME) {
                    this.elements.currentTimer.className = 'timer warning';
                }
                
                // Обновляем заполнение в зависимости от оставшегося времени
                this.updateFill(remaining, totalDuration);
            } else {
                // Встреча просрочена
                const overdue = Math.abs(remaining);
                this.elements.currentTimer.textContent = '-' + this.formatTimeRemaining(overdue);
                this.elements.currentTimer.className = 'timer overdue';
                
                // Полностью синий для просроченных встреч
                this.updateFill(0, totalDuration);
            }
        } else {
            // Если нет текущей встречи, показываем "Free-time" и обратный отсчет до следующей встречи
            this.elements.meetingTitle.textContent = 'Free-time';
            this.elements.currentTimer.textContent = 'Free-time';
            this.elements.currentTimer.className = 'timer';
            
            // Если есть следующая встреча, показываем обратный отсчет до неё
            if (this.nextMeeting) {
                const timeToNext = this.nextMeeting.start - now;
                if (timeToNext > 0) {
                    this.elements.currentTimer.textContent = this.formatTimeRemaining(timeToNext);
                }
            }
            
            // Если нет текущей встречи, показываем прозрачный фон
            const meetingBadge = document.querySelector('.meeting-badge');
            if (meetingBadge) {
                meetingBadge.style.background = 'transparent';
            }
        }
        
        // Показываем время начала следующей встречи по Москве
        if (this.nextMeeting) {
            this.elements.nextCountdown.textContent = this.formatMoscowTime(this.nextMeeting.start);
        } else {
            this.elements.nextCountdown.textContent = 'нет';
        }
    }
    
    updateFill(remaining, total) {
        // Вычисляем процент оставшегося времени (0-1)
        const progress = Math.max(0, Math.min(1, remaining / total));
        
        // Вычисляем процент заполнения (0% = прозрачный, 100% = синий)
        const fillPercentage = (1 - progress) * 100;
        
        // Обновляем CSS для эффекта заполнения
        const meetingBadge = document.querySelector('.meeting-badge');
        if (meetingBadge) {
            if (progress === 0) {
                // Полностью синий
                meetingBadge.style.background = '#0037C0';
            } else if (progress === 1) {
                // Прозрачный фон
                meetingBadge.style.background = 'transparent';
            } else {
                // Эффект заполнения - синий слева, прозрачный справа
                const gradient = `linear-gradient(90deg, #0037C0 0%, #0037C0 ${fillPercentage}%, transparent ${fillPercentage}%, transparent 100%)`;
                meetingBadge.style.background = gradient;
            }
            logger.debug(`Заполнение обновлено: progress=${progress.toFixed(2)}, fill=${fillPercentage.toFixed(1)}%`);
        }
    }
    
    formatMoscowTime(date) {
        // Конвертируем время в московский часовой пояс
        const moscowTime = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
        return moscowTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Moscow'
        });
    }
    
    formatTimeRemaining(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
}

// Инициализация при загрузке страницы
let meetingTimer;
document.addEventListener('DOMContentLoaded', () => {
    // Определяем, запущено ли в OBS с более строгими проверками
    const isOBS = detectOBSEnvironment();
    
    if (isOBS) {
        document.body.classList.add('obs-mode');
    }
    
    // Функция для точной детекции OBS
    // Функция для точной детекции OBS
    function detectOBSEnvironment() {
        // Проверка 1: URL содержит OBS-специфичные параметры или фрагменты
        const urlCheck = window.location.href.includes('obs') || 
                        window.location.href.includes('obs-studio') ||
                        window.location.search.includes('obs') ||
                        window.location.hash.includes('obs');
        
        // Проверка 2: User Agent содержит OBS
        const userAgentCheck = window.navigator.userAgent.includes('OBS') ||
                              window.navigator.userAgent.includes('obs-studio');
        
        // Проверка 3: Проверяем, что мы в iframe И есть специфичные признаки OBS
        const iframeCheck = window.parent !== window && (
            // Проверяем наличие frameElement с OBS-специфичными атрибутами
            (window.frameElement && (
                (window.frameElement.id && window.frameElement.id.includes('obs')) ||
                (window.frameElement.className && window.frameElement.className.includes('obs')) ||
                (window.frameElement.getAttribute('data-obs') !== null)
            )) ||
            // Проверяем referrer на OBS-специфичные хосты
            (document.referrer && (
                document.referrer.includes('obs-studio') ||
                document.referrer.includes('localhost') ||
                document.referrer.includes('127.0.0.1')
            )) ||
            // Безопасная проверка hostname родительского окна
            checkParentHostname()
        );
        
        // Требуем комбинацию проверок для подтверждения OBS
        // Минимум 2 из 3 проверок должны быть true, И должна быть хотя бы одна не-URL проверка
        const checks = [urlCheck, userAgentCheck, iframeCheck];
        const trueChecks = checks.filter(check => check).length;
        
        return trueChecks >= 2 && (userAgentCheck || iframeCheck);
    }

    function checkParentHostname() {
        try {
            return window.parent.location && (
                window.parent.location.hostname === 'localhost' ||
                window.parent.location.hostname === '127.0.0.1' ||
                window.parent.location.hostname.includes('obs')
            );
        } catch (e) {
            // Cross-origin access blocked - это нормально
            return false;
        }
    }

    meetingTimer = new MeetingTimer();
});

// Остановка таймеров при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (meetingTimer) {
        meetingTimer.stopTimer();
    }
});

// Обработка сообщений от OBS
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'refresh') {
        if (meetingTimer) {
            meetingTimer.refreshCalendar();
        }
    }
});

// Обновление при фокусе на вкладку (когда пользователь возвращается)
window.addEventListener('focus', () => {
    if (meetingTimer) {
        logger.debug('Вкладка получила фокус - обновляем календарь');
        meetingTimer.smartRefresh();
    }
});

// Обновление при видимости страницы (когда пользователь переключается на вкладку)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && meetingTimer) {
        logger.debug('Страница стала видимой - обновляем календарь');
        meetingTimer.smartRefresh();
    }
});

// Обработка горячих клавиш для обновления
document.addEventListener('keydown', (event) => {
    // F5 - обновить календарь
    if (event.key === 'F5') {
        event.preventDefault();
        if (meetingTimer) {
            meetingTimer.refreshCalendar();
        }
    }
    // Ctrl+R - обновить календарь
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        if (meetingTimer) {
            meetingTimer.refreshCalendar();
        }
    }
});

// Глобальные функции для обновления календаря (можно вызвать из консоли)
window.refreshCalendar = () => {
    if (meetingTimer) {
        meetingTimer.refreshCalendar();
    }
};

window.smartRefresh = () => {
    if (meetingTimer) {
        meetingTimer.smartRefresh();
    }
};

window.forceOBSRefresh = () => {
    if (meetingTimer) {
        meetingTimer.forceOBSRefresh();
    }
};

