class MeetingTimer {
    constructor() {
        this.currentMeeting = null;
        this.nextMeeting = null;
        this.isConnected = false;
        this.updateInterval = null;
        
        this.initializeElements();
        this.startTimer();
        this.loadMeetings();
    }
    
    initializeElements() {
        this.elements = {
            currentTimer: document.getElementById('currentTimer'),
            nextCountdown: document.getElementById('nextCountdown')
        };
        
        this.setupEmailInterface();
    }
    
    setupEmailInterface() {
        // Календарь захардкожен, интерфейс настройки не нужен
        console.log('Используется захардкоженный Google Calendar');
    }
    
    hideBadge() {
        // Показываем логотип компании когда встреч нет
        document.getElementById('meetingBadge').style.display = 'none';
        document.getElementById('companyLogo').style.display = 'flex';
        console.log('Нет встреч - показываем логотип компании');
    }
    
    showBadge() {
        // Показываем бейдж с информацией о встречах
        document.getElementById('meetingBadge').style.display = 'flex';
        document.getElementById('companyLogo').style.display = 'none';
        console.log('Есть встречи - показываем бейдж');
    }
    
    
    async loadMeetings() {
        try {
            // Загружаем из захардкоженного Google Calendar
            const publicCalendarUrl = this.getPublicCalendarUrl();
            if (publicCalendarUrl) {
                await this.loadFromPublicCalendar(publicCalendarUrl);
            } else {
                // Если что-то пошло не так, скрываем бейдж
                this.hideBadge();
            }
        } catch (error) {
            console.error('Ошибка загрузки встреч:', error);
            this.hideBadge();
        }
    }
    
    getPublicCalendarUrl() {
        // Получаем Google Calendar URL
        const googleCalendarUrl = this.getGoogleCalendarUrl();
        if (googleCalendarUrl) {
            return googleCalendarUrl;
        }
        
        // Если URL не указан, используем демо-режим
        return null;
    }
    
    getGoogleCalendarUrl() {
        // Приватная ссылка на календарь "Тест" с ключом доступа
        return 'https://calendar.google.com/calendar/ical/a94fd18710fba31c468c5bb408b8f9895994fee34f76dc38fe053834daaff590%40group.calendar.google.com/private-44dfd0ef1af07d1b29e7b892de3bc009/basic.ics';
    }
    
    async loadFromPublicCalendar(calendarUrl) {
        try {
            console.log('Загружаем календарь из:', calendarUrl);
            
            // Сразу используем CORS proxy для обхода блокировок
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(calendarUrl)}`;
            console.log('Используем CORS proxy:', proxyUrl);
            
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const icalData = await response.text();
            console.log('iCal данные загружены, размер:', icalData.length, 'символов');
            
            // Проверяем, не получили ли мы HTML ошибку вместо iCal
            if (icalData.includes('<html') || icalData.includes('Error 404')) {
                console.error('Получена HTML ошибка вместо iCal данных. Календарь не публичный или не существует.');
                console.log('Используем демо-данные для тестирования...');
                this.loadDemoData();
                return;
            }
            
            const events = this.parseICalData(icalData);
            console.log('События распарсены:', events.length);
            
            this.processCalendarEvents(events);
            
        } catch (error) {
            console.error('Ошибка загрузки календаря через proxy:', error);
            console.log('Переключаемся на демо-данные...');
            this.loadDemoData();
        }
    }
    
    loadDemoData() {
        const now = new Date();
        
        // Создаем демо-встречу на сегодня
        const demoEvents = [
            {
                summary: 'Демо встреча',
                start: new Date(now.getTime() + 30 * 60 * 1000), // через 30 минут
                end: new Date(now.getTime() + 90 * 60 * 1000)    // длится 1 час
            }
        ];
        
        this.processCalendarEvents(demoEvents);
    }
    
    parseICalData(icalData) {
        const events = [];
        const lines = icalData.split('\n');
        let currentEvent = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
            } else if (line === 'END:VEVENT' && currentEvent) {
                if (currentEvent.summary && currentEvent.start && currentEvent.end) {
                    events.push({
                        summary: currentEvent.summary,
                        start: currentEvent.start,
                        end: currentEvent.end
                    });
                }
                currentEvent = null;
            } else if (currentEvent) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':');
                
                switch (key) {
                    case 'SUMMARY':
                        currentEvent.summary = value;
                        break;
                    case 'DTSTART':
                        currentEvent.start = this.parseICalDate(value);
                        break;
                    case 'DTEND':
                        currentEvent.end = this.parseICalDate(value);
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
            
            // Создаем дату в московском часовом поясе
            return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`);
        } else if (dateString.endsWith('Z')) {
            // Формат UTC: 20250921T180000Z
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            const hour = dateString.substring(9, 11);
            const minute = dateString.substring(11, 13);
            const second = dateString.substring(13, 15);
            
            return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
        } else {
            // Простой формат: 20250922T104500
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            const hour = dateString.substring(9, 11);
            const minute = dateString.substring(11, 13);
            const second = dateString.substring(13, 15);
            
            return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`);
        }
    }
    
    processCalendarEvents(events) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        // Фильтруем события на сегодня и завтра
        const relevantEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate >= today && eventDate < tomorrow;
        });
        
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
        
        // Если нет ни текущей, ни следующей встречи - скрываем бейдж
        if (!this.currentMeeting && !this.nextMeeting) {
            this.hideBadge();
            return;
        }
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        // Показываем бейдж, так как есть встречи
        this.showBadge();
        
        // Инициализируем градиент и таймеры
        this.updateTimers();
        
        // Принудительно обновляем градиент
        setTimeout(() => {
            this.updateTimers();
        }, 100);
    }
    
    startTimer() {
        this.updateInterval = setInterval(() => {
            this.updateTimers();
        }, 1000);
        
        // Обновляем данные о встречах каждую минуту
        this.calendarUpdateInterval = setInterval(() => {
            console.log('Обновляем данные календаря...');
            this.loadMeetings();
        }, 60 * 1000); // 1 минута
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
    }
    
    // Принудительное обновление календаря
    refreshCalendar() {
        console.log('Принудительное обновление календаря...');
        this.loadMeetings();
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
                
                // Предупреждение за 5 минут до конца
                if (remaining < 5 * 60 * 1000) {
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
                } else {
                    this.elements.currentTimer.textContent = 'Free-time';
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
            console.log(`Заполнение обновлено: progress=${progress.toFixed(2)}, fill=${fillPercentage.toFixed(1)}%`);
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
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
}

// Инициализация при загрузке страницы
let meetingTimer;
document.addEventListener('DOMContentLoaded', () => {
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

// Глобальная функция для обновления календаря (можно вызвать из консоли)
window.refreshCalendar = () => {
    if (meetingTimer) {
        meetingTimer.refreshCalendar();
    }
};
