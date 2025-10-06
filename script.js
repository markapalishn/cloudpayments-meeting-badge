// Упрощенная система логирования
const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => {
        if (window.CONFIG?.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    },
    verbose: (...args) => {
        if (window.CONFIG?.VERBOSE_LOGGING) {
            console.log('[VERBOSE]', ...args);
        }
    }
};

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
        // Скрываем лоадер
        this.hideLoader();
        
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
            this.showLoader();
            const calendarUrl = this.getGoogleCalendarUrl();
            await this.loadFromPublicCalendar(calendarUrl);
        } catch (error) {
            logger.error('Ошибка загрузки встреч:', error);
            this.hideBadge();
        }
    }
    
    getGoogleCalendarUrl() {
        return window.CONFIG.CALENDAR_URL;
    }
    
    async fetchWithProxy(url) {
        const proxies = window.CONFIG.PROXY_URLS || [];
        const timeout = window.CONFIG.PROXY_TIMEOUT || 10000;

        const resolveProxyUrl = (template, rawUrl) => {
            if (!template) return '';
            return template
                .replaceAll('{ENCODED_URL}', encodeURIComponent(rawUrl))
                .replaceAll('{URL}', rawUrl);
        };
        
        if (!Array.isArray(proxies) || proxies.length === 0) {
            throw new Error('Список proxy пуст. Настройте CONFIG.PROXY_URLS или используйте DIRECT_CALENDAR_ENDPOINT.');
        }
        
        for (let i = 0; i < proxies.length; i++) {
            const proxyTemplate = proxies[i];
            const proxyUrl = resolveProxyUrl(proxyTemplate, url);
            try {
                logger.info(`🔄 Пробуем proxy ${i + 1}/${proxies.length}:`, proxyUrl);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(proxyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    logger.info(`✅ Proxy ${i + 1} успешно загрузил данные`);
                    return response;
                }
            } catch (error) {
                logger.warn(`❌ Proxy ${i + 1} не сработал:`, error.message);
                if (i === proxies.length - 1) {
                    throw new Error(`Все proxy сервисы недоступны. Последняя ошибка: ${error.message}`);
                }
            }
        }
        
        throw new Error('Ни один proxy не вернул успешный ответ (response.ok=false).');
    }
    
    async loadFromPublicCalendar(calendarUrl) {
        try {
            logger.info('🔄 Загружаем события на сегодня из календаря');
            
            // Добавляем параметр для обхода кэша Google Calendar
            let urlWithCacheBuster = calendarUrl;
            if (calendarUrl.includes('calendar.google.com')) {
                const separator = calendarUrl.includes('?') ? '&' : '?';
                urlWithCacheBuster = `${calendarUrl}${separator}_t=${Date.now()}&_v=${Math.random()}`;
                logger.info('🔄 Добавлен параметр обхода кэша:', urlWithCacheBuster);
            }
            
            // Используем proxy для обхода CORS ограничений Google Calendar
            const startTime = Date.now();
            let response;
            
            // Проверяем, является ли это Google Calendar URL
            logger.info('🔍 Проверяем URL календаря:', urlWithCacheBuster);
            if (urlWithCacheBuster.includes('calendar.google.com')) {
                // Пробуем прямой корпоративный эндпоинт, если задан
                if (window.CONFIG?.DIRECT_CALENDAR_ENDPOINT) {
                    try {
                        logger.info('🔧 Пробуем прямой корпоративный эндпоинт...');
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), window.CONFIG.DIRECT_REQUEST_TIMEOUT || 8000);
                        const directUrl = `${window.CONFIG.DIRECT_CALENDAR_ENDPOINT}${encodeURIComponent(urlWithCacheBuster)}`;
                        response = await fetch(directUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);
                    } catch (directErr) {
                        logger.warn('❌ Прямой эндпоинт недоступен, fallback на proxy:', directErr.message);
                    }
                }

                if (!response || !response.ok) {
                    logger.info('🔧 ОБХОД CORS: Используем proxy для Google Calendar...');
                    response = await this.fetchWithProxy(urlWithCacheBuster);
                }
            } else {
                logger.info('🔧 Прямой запрос для не-Google календаря...');
                // Для других календарей пробуем прямой запрос с таймаутом
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), window.CONFIG?.DIRECT_REQUEST_TIMEOUT || 8000);
                    response = await fetch(calendarUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);
                } catch (corsError) {
                    logger.debug('CORS блокирует прямой запрос, используем proxy...');
                    response = await this.fetchWithProxy(calendarUrl);
                }
            }
            
            const loadTime = Date.now() - startTime;
            logger.debug(`Запрос выполнен за ${loadTime}ms`);
            
            if (!response) {
                throw new Error('Не удалось получить ответ ни от прямого эндпоинта, ни от proxy.');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const icalData = await response.text();
            logger.info('✅ iCal данные загружены, размер:', icalData.length, 'символов');
            logger.debug('Первые 200 символов ответа:', icalData.substring(0, 200));
            
            // Сначала проверяем, что ответ не HTML-страница (с доп. защитой)
            const isHtmlLike = /<\s*html[\s>]/i.test(icalData);
            if (!icalData.includes('BEGIN:VCALENDAR') && (isHtmlLike || icalData.includes('Error 404'))) {
                logger.error('Получена HTML ошибка вместо iCal данных. Календарь не публичный или не существует.');
                logger.error('Полученные данные (первые 500 символов):', icalData.substring(0, 500));
                this.hideBadge();
                return;
            }

            // Проверяем, что это валидные iCal данные
            if (!icalData.includes('BEGIN:VCALENDAR')) {
                logger.error('Получены невалидные iCal данные. Ожидается BEGIN:VCALENDAR');
                logger.error('Полученные данные (первые 500 символов):', icalData.substring(0, 500));
                this.hideBadge();
                return;
            }
            
            logger.info('✅ Данные содержат BEGIN:VCALENDAR - это валидные iCal данные');
            
            logger.info('✅ Данные не содержат HTML ошибок - продолжаем обработку');
            
            const events = this.parseICalData(icalData);
            logger.info('📅 События распарсены:', events.length);
            
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
                // Если нет SUMMARY, создаем название по умолчанию
                if (!currentEvent.summary) {
                    currentEvent.summary = 'Встреча';
                    logger.info('📝 Создано название по умолчанию: "Встреча"');
                }
                
                // Проверяем каждое поле отдельно
                const hasSummary = !!currentEvent.summary;
                const hasStart = !!currentEvent.start;
                const hasEnd = !!currentEvent.end;
                
                if (hasSummary && hasStart && hasEnd) {
                    // Если есть правило повторения, генерируем повторяющиеся события
                    if (currentEvent.rrule) {
                        const recurringEvents = this.generateRecurringEvents(currentEvent);
                        events.push(...recurringEvents);
                        logger.info(`✅ Добавлено ${recurringEvents.length} повторяющихся событий для "${currentEvent.summary}"`);
                    } else {
                        // Обычное событие без повторения
                        events.push({
                            summary: currentEvent.summary,
                            start: currentEvent.start,
                            end: currentEvent.end
                        });
                        logger.info('✅ Событие добавлено:', {
                            summary: currentEvent.summary,
                            start: currentEvent.start,
                            end: currentEvent.end
                        });
                    }
                } else {
                    logger.warn('❌ Событие пропущено - неполные данные:', {
                        missing: {
                            summary: !hasSummary,
                            start: !hasStart,
                            end: !hasEnd
                        },
                        event: currentEvent
                    });
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
                        logger.verbose('📝 Найден SUMMARY:', value);
                        break;
                    case 'TITLE':
                        // Альтернативное поле для названия
                        if (!currentEvent.summary) {
                            currentEvent.summary = value;
                            logger.verbose('📝 Найден TITLE (используем как SUMMARY):', value);
                        }
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
                case 'RRULE':
                    currentEvent.rrule = value;
                    logger.verbose('🔄 Найдено правило повторения:', value);
                    break;
                }
            }
        }
        
        return events;
    }
    
    generateRecurringEvents(event) {
        const events = [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Валидация входных дат
        const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
        if (!isValidDate(event.start) || !isValidDate(event.end)) {
            logger.warn('❌ Невалидные даты в событии для RRULE, пропускаем:', {
                summary: event.summary,
                start: event.start,
                end: event.end
            });
            return events;
        }
        if (event.end.getTime() <= event.start.getTime()) {
            logger.warn('❌ Некорректная длительность (end <= start) в событии для RRULE, пропускаем:', {
                summary: event.summary,
                start: event.start.toISOString(),
                end: event.end.toISOString()
            });
            return events;
        }

        // Окно развёртки повторений (дней)
        const rawWindow = window.CONFIG?.RECURRENCE_WINDOW_DAYS;
        const windowDays = Number.isInteger(rawWindow) && rawWindow > 0 ? rawWindow : 7;
        const endDate = new Date(today.getTime() + windowDays * 24 * 60 * 60 * 1000);
        
        logger.info('🔄 Генерируем повторяющиеся события для:', event.summary, 'Окно (дней):', windowDays);
        
        // Простая логика: генерируем события на каждый день недели, указанный в BYDAY
        const rrule = this.parseRRULE(event.rrule);
        if (!rrule || !rrule.byday) {
            logger.warn('❌ Не удалось распарсить RRULE или нет BYDAY:', event.rrule);
            return events;
        }
        
        // Конвертируем дни недели из iCal формата в числа
        const dayMap = { 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0 };
        const allowedDays = rrule.byday.map(day => dayMap[day]).filter(day => day !== undefined);
        
        logger.info('🔄 Дни недели для повторения:', allowedDays);
        
        // Генерируем события на ближайшее окно
        for (let i = 0; i < windowDays; i++) {
            const currentDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
            const dayOfWeek = currentDate.getDay();
            
            if (allowedDays.includes(dayOfWeek)) {
                // Создаем событие с правильным временем
                const eventStart = new Date(currentDate);
                eventStart.setHours(event.start.getHours());
                eventStart.setMinutes(event.start.getMinutes());
                eventStart.setSeconds(event.start.getSeconds());
                
                const duration = event.end.getTime() - event.start.getTime();
                const eventEnd = new Date(eventStart.getTime() + duration);
                
                // Доп. валидация результата
                if (!isValidDate(eventStart) || !isValidDate(eventEnd) || eventEnd.getTime() <= eventStart.getTime()) {
                    logger.warn('❌ Пропущено сгенерированное событие из-за невалидных дат:', {
                        summary: event.summary,
                        start: eventStart,
                        end: eventEnd
                    });
                    continue;
                }

                events.push({
                    summary: event.summary,
                    start: eventStart,
                    end: eventEnd
                });
                
                logger.info('✅ Сгенерировано событие:', {
                    summary: event.summary,
                    start: eventStart.toLocaleString(),
                    end: eventEnd.toLocaleString()
                });
            }
        }
        
        logger.info(`🔄 Всего сгенерировано ${events.length} повторяющихся событий`);
        return events;
    }
    
    parseRRULE(rruleString) {
        const rule = {};
        const parts = rruleString.split(';');
        
        for (const part of parts) {
            const [key, value] = part.split('=');
            switch (key) {
                case 'FREQ':
                    rule.freq = value;
                    break;
                case 'BYDAY':
                    rule.byday = value.split(',');
                    break;
                case 'INTERVAL':
                    rule.interval = parseInt(value) || 1;
                    break;
                case 'COUNT':
                    rule.count = parseInt(value);
                    break;
                case 'UNTIL':
                    rule.until = new Date(value);
                    break;
            }
        }
        
        return rule;
    }
    
    parseICalDate(dateString) {
        logger.verbose('📅 Парсим дату:', dateString);
        
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
            logger.verbose('📅 Создаем дату (Moscow):', dateStr);
            const result = new Date(dateStr);
            logger.verbose('📅 Результат (Moscow):', result, 'Valid:', !isNaN(result.getTime()));
            return result;
        } else if (dateString.endsWith('Z')) {
            // Формат UTC: DTSTART:20250921T180000Z
            // Извлекаем только дату после двоеточия
            const colonIndex = dateString.indexOf(':');
            if (colonIndex === -1) {
                logger.warn('❌ Не найден разделитель ":" в UTC дате:', dateString);
                return new Date('Invalid Date');
            }
            
            const datePart = dateString.substring(colonIndex + 1);
            const year = datePart.substring(0, 4);
            const month = datePart.substring(4, 6);
            const day = datePart.substring(6, 8);
            const hour = datePart.substring(9, 11);
            const minute = datePart.substring(11, 13);
            const second = datePart.substring(13, 15);
            
            const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
            logger.verbose('📅 Создаем дату (UTC):', dateStr);
            const result = new Date(dateStr);
            logger.verbose('📅 Результат (UTC):', result, 'Valid:', !isNaN(result.getTime()));
            return result;
        } else if (dateString.length >= 15 && dateString.includes('T')) {
            // Простой формат: DTSTART:20250922T104500
            // Извлекаем только дату после двоеточия
            const colonIndex = dateString.indexOf(':');
            if (colonIndex === -1) {
                logger.warn('❌ Не найден разделитель ":" в простой дате:', dateString);
                return new Date('Invalid Date');
            }
            
            const datePart = dateString.substring(colonIndex + 1);
            const year = datePart.substring(0, 4);
            const month = datePart.substring(4, 6);
            const day = datePart.substring(6, 8);
            const hour = datePart.substring(9, 11);
            const minute = datePart.substring(11, 13);
            const second = datePart.substring(13, 15);
            
            const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
            logger.verbose('📅 Создаем дату (простой):', dateStr);
            const result = new Date(dateStr);
            logger.verbose('📅 Результат (простой):', result, 'Valid:', !isNaN(result.getTime()));
            return result;
        } else {
            // Неизвестный формат даты
            logger.warn('❌ Неизвестный формат даты:', dateString);
            return new Date('Invalid Date');
        }
    }
    
    processCalendarEvents(events) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        logger.info('📅 Обрабатываем события календаря:', events.length);
        logger.info('🕐 Текущее время:', now.toLocaleString());
        logger.info('📅 Сегодня:', today.toLocaleDateString());
        
        // Фильтруем события на сегодня
        const todayEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            const isToday = eventDate >= today && eventDate < tomorrow;
            
            logger.verbose(`🔍 Проверяем событие "${event.summary}":`, {
                start: event.start.toLocaleString(),
                eventDate: eventDate.toLocaleString(),
                today: today.toLocaleString(),
                tomorrow: tomorrow.toLocaleString(),
                isToday: isToday
            });
            
            return isToday;
        });
        
        logger.info('📅 Событий на сегодня:', todayEvents.length);
        
        // Показываем все события на сегодня
        todayEvents.forEach((event, index) => {
            logger.info(`📅 Событие ${index + 1}:`, {
                summary: event.summary,
                start: event.start.toLocaleString(),
                end: event.end.toLocaleString(),
                isNow: event.start <= now && event.end > now,
                isFuture: event.start > now
            });
        });
        
        // Сортируем по времени начала
        todayEvents.sort((a, b) => a.start - b.start);
        
        // Находим текущую встречу
        this.currentMeeting = todayEvents.find(event => {
            const isCurrent = event.start <= now && event.end > now;
            return isCurrent;
        });
        
        // Находим следующую встречу
        this.nextMeeting = todayEvents.find(event => {
            const isFuture = event.start > now;
            return isFuture;
        });
        
        logger.info('✅ Текущая встреча:', this.currentMeeting ? this.currentMeeting.summary : 'нет');
        logger.info('⏭️ Следующая встреча:', this.nextMeeting ? this.nextMeeting.summary : 'нет');
        
        // Если нет встреч на сегодня - показываем логотип компании
        if (todayEvents.length === 0) {
            logger.info('Нет встреч на сегодня - показываем логотип компании');
            this.hideBadge();
            this.updateEmployeeInfo();
            return;
        }
        
        logger.info('Есть встречи на сегодня - показываем бейдж');
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.hideLoader();
        // Если сейчас нет текущей встречи, показываем логотип компании
        if (this.currentMeeting) {
            this.showBadge();
        } else {
            this.hideBadge();
        }
        this.updateTimers();
        this.updateEmployeeInfo();
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
        logger.info('🔄 Принудительное обновление календаря...');
        // Показываем лоадер (он скроет бейдж встречи)
        this.showLoader();
        // Очищаем текущие данные
        this.currentMeeting = null;
        this.nextMeeting = null;
        
        // Загружаем календарь сразу
        this.loadMeetings();
    }
    
    showLoader() {
        // Скрываем бейдж встречи и показываем лоадер
        const meetingBadge = document.getElementById('meetingBadge');
        const loader = document.getElementById('loader');
        
        if (meetingBadge) {
            meetingBadge.style.display = 'none';
        }
        if (loader) {
            loader.style.display = 'flex';
            logger.info('🔄 Лоадер показан');
        } else {
            logger.warn('❌ Лоадер не найден');
        }
    }
    
    hideLoader() {
        // Скрываем лоадер и показываем бейдж встречи
        const meetingBadge = document.getElementById('meetingBadge');
        const loader = document.getElementById('loader');
        
        if (loader) {
            loader.style.display = 'none';
        }
        if (meetingBadge) {
            meetingBadge.style.display = 'flex';
        }
        logger.info('✅ Лоадер скрыт');
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
        
        if (this.currentMeeting) {
            const remaining = this.currentMeeting.end - now;
            const totalDuration = this.currentMeeting.end - this.currentMeeting.start;
            
            this.elements.meetingTitle.textContent = 'Конец через';
            
            if (remaining > 0) {
                this.elements.currentTimer.textContent = this.formatTimeRemaining(remaining);
                this.elements.currentTimer.className = remaining < window.CONFIG.WARNING_TIME ? 'timer warning' : 'timer';
                this.updateFill(remaining, totalDuration);
            } else {
                const overdue = Math.abs(remaining);
                this.elements.currentTimer.textContent = '-' + this.formatTimeRemaining(overdue);
                this.elements.currentTimer.className = 'timer overdue';
                this.updateFill(0, totalDuration);
            }
        } else {
            this.elements.meetingTitle.textContent = 'Free-time';
            this.elements.currentTimer.textContent = 'Free-time';
            this.elements.currentTimer.className = 'timer';
            
            if (this.nextMeeting) {
                const timeToNext = this.nextMeeting.start - now;
                if (timeToNext > 0) {
                    this.elements.currentTimer.textContent = this.formatTimeRemaining(timeToNext);
                }
            }
            
            const meetingBadge = document.querySelector('.meeting-badge');
            if (meetingBadge) {
                meetingBadge.style.background = 'transparent';
            }
        }
        
        this.elements.nextCountdown.textContent = this.nextMeeting ? this.formatMoscowTime(this.nextMeeting.start) : 'нет';
    }
    
    updateFill(remaining, total) {
        const progress = Math.max(0, Math.min(1, remaining / total));
        const fillPercentage = (1 - progress) * 100;
        const meetingBadge = document.querySelector('.meeting-badge');
        
        if (meetingBadge) {
            if (progress === 0) {
                meetingBadge.style.background = '#0037C0';
            } else if (progress === 1) {
                meetingBadge.style.background = 'transparent';
            } else {
                const gradient = `linear-gradient(90deg, #0037C0 0%, #0037C0 ${fillPercentage}%, transparent ${fillPercentage}%, transparent 100%)`;
                meetingBadge.style.background = gradient;
            }
        }
    }
    
    formatMoscowTime(date) {
        return date.toLocaleTimeString('ru-RU', {
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
        
        const pad = (n) => n.toString().padStart(2, '0');
        return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
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
    function detectOBSEnvironment() {
        const urlCheck = window.location.href.includes('obs') || window.location.href.includes('obs-studio');
        const userAgentCheck = window.navigator.userAgent.includes('OBS') || window.navigator.userAgent.includes('obs-studio');
        const iframeCheck = window.parent !== window && (
            (window.frameElement && window.frameElement.id?.includes('obs')) ||
            (document.referrer && (document.referrer.includes('localhost') || document.referrer.includes('127.0.0.1')))
        );
        
        const checks = [urlCheck, userAgentCheck, iframeCheck];
        return checks.filter(check => check).length >= 2 && (userAgentCheck || iframeCheck);
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


window.forceOBSRefresh = () => {
    if (meetingTimer) {
        meetingTimer.forceOBSRefresh();
    }
};

