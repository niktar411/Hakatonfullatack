// register.js
document.addEventListener('DOMContentLoaded', function() {
    const registerBtn = document.getElementById('registerBtn');
    const registrationModal = document.getElementById('registrationModal');
    const registrationForm = document.getElementById('registrationForm');
    const studentFields = document.getElementById('studentFields');
    const adminFields = document.getElementById('adminFields');
    const roleRadios = document.querySelectorAll('input[name="role"]');
    
    // Данные групп по корпусам
    const groupsByBuilding = {
        'a': ['А101', 'А102', 'А103', 'А201', 'А202'],
        'y': ['У101', 'У102', 'У103', 'У201', 'У202'],
        'g': ['Г101', 'Г102', 'Г103', 'Г201', 'Г202'],
        'k': ['К101', 'К102', 'К103', 'К201', 'К202']
    };

    // Пароль администратора (в реальном приложении это должно храниться на сервере)
    const ADMIN_PASSWORD = 'admin123';

    // Открытие модального окна
    registerBtn.addEventListener('click', function() {
        registrationModal.style.display = 'block';
    });

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === registrationModal) {
            registrationModal.style.display = 'none';
        }
    });

    // Закрытие модального окна при клике на отмену
    document.getElementById('cancelBtn').addEventListener('click', function() {
        registrationModal.style.display = 'none';
    });

    // Переключение между учеником и админом
    roleRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'student') {
                studentFields.style.display = 'block';
                adminFields.style.display = 'none';
            } else {
                studentFields.style.display = 'none';
                adminFields.style.display = 'block';
            }
        });
    });

    // Заполнение списка групп при выборе корпуса
    const buildingSelect = document.getElementById('building');
    const groupSelect = document.getElementById('group');

    buildingSelect.addEventListener('change', function() {
        updateGroups(this.value);
    });

    // Инициализация групп при загрузке
    updateGroups(buildingSelect.value);

    function updateGroups(building) {
        groupSelect.innerHTML = '';
        const groups = groupsByBuilding[building] || [];
        
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            groupSelect.appendChild(option);
        });
    }

    // Обработка отправки формы
    registrationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const formData = new FormData(this);
        const role = formData.get('role');
        
        if (role === 'student') {
            const building = formData.get('building');
            const group = formData.get('group');
            
            // Сохраняем данные в localStorage
            localStorage.setItem('userRole', 'student');
            localStorage.setItem('userBuilding', building);
            localStorage.setItem('userGroup', group);
            
        } else if (role === 'admin') {
            const password = formData.get('adminPassword');
            
            if (password === ADMIN_PASSWORD) {
                // Сохраняем данные в localStorage
                localStorage.setItem('userRole', 'admin');
            } else {
                showNotification('Неверный пароль администратора!', 'error');
                return;
            }
        }
        
        // Закрываем модальное окно
        registrationModal.style.display = 'none';
        
        // Очищаем форму
        registrationForm.reset();
        
        // Обновляем интерфейс в зависимости от роли
        updateUIAfterRegistration();
    });

    function updateUIAfterRegistration() {
        const userRole = localStorage.getItem('userRole');
        
        if (userRole === 'admin') {
            // Меняем внешний вид кнопки для админа
            registerBtn.textContent = 'Администратор';
            registerBtn.style.backgroundColor = '#dc3545';
            
            // Перезагружаем расписание для отображения административных элементов
            if (typeof loadScheduleFromJSON === 'function') {
                loadScheduleFromJSON();
            }
            showNotification('Режим администратора активирован', 'success');
        } else if (userRole === 'student') {
            // Обновляем выбранные значения в основном интерфейсе
            const userBuilding = localStorage.getItem('userBuilding');
            const userGroup = localStorage.getItem('userGroup');
            
            // Обновляем кнопку профиля
            registerBtn.textContent = 'Студент';
            registerBtn.style.backgroundColor = '#28a745';
            
            // Обновляем основные элементы управления расписанием
            updateScheduleControls(userBuilding, userGroup);
            
            // Перезагружаем расписание
            if (typeof loadScheduleFromJSON === 'function') {
                loadScheduleFromJSON();
            }
        }
    }

    // Функция для обновления элементов управления расписанием
    function updateScheduleControls(building, group) {
        // Обновляем кнопки корпуса и группы
        const buildingBtn = document.getElementById('buildingBtn');
        const groupBtn = document.getElementById('groupBtn');
        
        if (buildingBtn && groupBtn) {
            // Обновляем текст кнопок
            const buildingNames = {
                'a': 'Корпус А',
                'y': 'Корпус У', 
                'g': 'Корпус Г',
                'k': 'Корпус К'
            };
            
            buildingBtn.textContent = buildingNames[building] || 'Корпус';
            groupBtn.textContent = group || 'Группа';
            
            // Обновляем глобальные переменные расписания
            if (typeof currentBuilding !== 'undefined') {
                currentBuilding = building;
            }
            if (typeof currentGroup !== 'undefined') {
                currentGroup = group ? group.toLowerCase() : 'а101';
            }
        }
    }

    // Функция для показа уведомлений
    function showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        // Цвета в зависимости от типа
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#0078cf'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Добавляем в DOM
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Автоматическое скрытие через 3 секунды
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Проверяем, есть ли уже данные о пользователе при загрузке
    if (localStorage.getItem('userRole')) {
        updateUIAfterRegistration();
        
        // Если пользователь - студент, автоматически выбираем его группу в расписании
        if (localStorage.getItem('userRole') === 'student') {
            const userBuilding = localStorage.getItem('userBuilding');
            const userGroup = localStorage.getItem('userGroup');
            
            if (userBuilding && userGroup) {
                // Ждем загрузки основного скрипта расписания
                setTimeout(() => {
                    updateScheduleControls(userBuilding, userGroup);
                    if (typeof loadScheduleFromJSON === 'function') {
                        loadScheduleFromJSON();
                    }
                }, 100);
            }
        }
    }
});