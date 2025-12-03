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
        // Ветka main-without-calendar: отключаем синхронизацию с календарём,
        // показываем только дефолтное состояние бейджа
        this.setDefaultState();
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
    
    // Дефолтное состояние без календаря:
    // показываем логотип компании и информацию о сотруднике,
    // таймеры фиксированы в режиме Free-time
    setDefaultState() {
        this.hideLoader();
        this.currentMeeting = null;
        this.nextMeeting = null;
        
        if (this.elements.meetingTitle) {
            this.elements.meetingTitle.textContent = 'Free-time';
        }
        if (this.elements.currentTimer) {
            this.elements.currentTimer.textContent = 'Free-time';
            this.elements.currentTimer.className = 'timer';
        }
        if (this.elements.nextCountdown) {
            this.elements.nextCountdown.textContent = 'нет';
        }
        
        this.hideBadge();
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
    
    // Принудительное обновление календаря
    refreshCalendar() {
        // Ветка main-without-calendar: никакой реальной синхронизации с календарём
        logger.info('🔄 Режим без календаря: refreshCalendar() ничего не делает, устанавливаем дефолтное состояние');
        this.setDefaultState();
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
        // Ветка main-without-calendar: просто слегка дёргаем DOM для OBS,
        // но не трогаем календарь
        this.setDefaultState();

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

