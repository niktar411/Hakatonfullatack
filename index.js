// index.js
// Время пар
const lessonTimes = {
    1: "8:30 - 9:50",
    2: "10:00 - 11:20", 
    3: "11:30 - 12:50",
    4: "13:00 - 14:20",
    5: "14:30 - 15:50",
    6: "16:00 - 17:20",
    7: "17:30 - 18:50",
    8: "19:00 - 20:20",
};

// Дни недели
const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

// Добавим mapping корпусов и групп
const buildingGroups = {
    'a': ['А101', 'А102', 'А103', 'А201', 'А202'],
    'y': ['У101', 'У102', 'У103', 'У201', 'У202'],
    'g': ['Г101', 'Г102', 'Г103', 'Г201', 'Г202'],
    'k': ['К101', 'К102', 'К103', 'К201', 'К202']
};

// Переменные для хранения текущих выбранных значений
let currentGroup = 'а101';
let currentBuilding = 'a';
let currentWeekOffset = 0;

// Хранилище для созданных пар (в реальном приложении это должно быть на сервере)
let customScheduleData = JSON.parse(localStorage.getItem('customScheduleData')) || {};

// Данные о преподавателях и их предметах
const teachersData = [
    { id: 1, name: "Иванов Иван Иванович", subjects: ["Математика", "Физика"], busySlots: [] },
    { id: 2, name: "Петрова Анна Сергеевна", subjects: ["Программирование", "Базы данных"], busySlots: [] },
    { id: 3, name: "Сидоров Алексей Владимирович", subjects: ["Английский язык"], busySlots: [] },
    { id: 4, name: "Козлова Мария Петровна", subjects: ["История"], busySlots: [] },
    { id: 5, name: "Николаев Дмитрий Олегович", subjects: ["Физкультура"], busySlots: [] }
];

// Переменные для хранения данных о редактируемой ячейке
let currentEditCell = null;
let currentEditDay = null;
let currentEditLesson = null;

// Базовый URL API
const API_BASE = 'http://localhost:3000/api';

// Функция для проверки режима администратора
function isAdminMode() {
    return localStorage.getItem('userRole') === 'admin';
}

// Функция для получения расписания (объединяет данные из JSON и пользовательские данные)
function getMergedSchedule(scheduleData) {
    const mergedData = JSON.parse(JSON.stringify(scheduleData));
    
    // Добавляем пользовательские данные
    if (customScheduleData[currentGroup] && customScheduleData[currentGroup][currentBuilding]) {
        const customBuildingData = customScheduleData[currentGroup][currentBuilding];
        
        customBuildingData.forEach(customDay => {
            const dayIndex = mergedData[currentGroup]?.[currentBuilding]?.findIndex(d => d.day === customDay.day);
            
            if (dayIndex !== -1 && dayIndex !== undefined) {
                // Объединяем уроки для существующего дня
                customDay.lessons.forEach(customLesson => {
                    const lessonIndex = mergedData[currentGroup][currentBuilding][dayIndex].lessons.findIndex(l => l.number === customLesson.number);
                    
                    if (lessonIndex !== -1) {
                        // Заменяем существующий урок
                        mergedData[currentGroup][currentBuilding][dayIndex].lessons[lessonIndex] = customLesson;
                    } else {
                        // Добавляем новый урок
                        mergedData[currentGroup][currentBuilding][dayIndex].lessons.push(customLesson);
                    }
                });
            } else {
                // Добавляем новый день
                if (!mergedData[currentGroup]) mergedData[currentGroup] = {};
                if (!mergedData[currentGroup][currentBuilding]) mergedData[currentGroup][currentBuilding] = [];
                mergedData[currentGroup][currentBuilding].push(customDay);
            }
        });
    }
    
    return mergedData;
}

// Функция для сохранения пользовательского расписания (fallback)
function saveCustomSchedule() {
    localStorage.setItem('customScheduleData', JSON.stringify(customScheduleData));
}

// Функция для добавления/обновления пары
async function saveLesson(day, lessonNumber, teacher, subject, room, lessonType) {
    try {
        const user = localStorage.getItem('userRole') === 'admin' ? 'admin' : 'student';
        
        const response = await fetch(`${API_BASE}/schedule/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                day: day,
                lessonNumber: lessonNumber,
                teacher: teacher,
                subject: subject,
                room: room,
                lessonType: lessonType,
                group: currentGroup,
                building: currentBuilding,
                user: user
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Пара успешно сохранена', 'success');
            loadScheduleFromJSON();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения: ' + error.message, 'error');
        
        // Fallback: сохраняем в localStorage
        saveToLocalStorage(day, lessonNumber, teacher, subject, room, lessonType);
    }
}

// Fallback функция для сохранения в localStorage
function saveToLocalStorage(day, lessonNumber, teacher, subject, room, lessonType) {
    // Инициализируем структуру данных если её нет
    if (!customScheduleData[currentGroup]) customScheduleData[currentGroup] = {};
    if (!customScheduleData[currentGroup][currentBuilding]) customScheduleData[currentGroup][currentBuilding] = [];
    
    // Находим день в пользовательских данных
    let dayData = customScheduleData[currentGroup][currentBuilding].find(d => d.day === day);
    
    if (!dayData) {
        dayData = { day: day, lessons: [] };
        customScheduleData[currentGroup][currentBuilding].push(dayData);
    }
    
    // Находим урок в дне
    const lessonIndex = dayData.lessons.findIndex(l => l.number === lessonNumber);
    const lessonData = {
        number: lessonNumber,
        subject: subject,
        teacher: teacher,
        room: room,
        type: lessonType || 'lecture'
    };
    
    if (lessonIndex !== -1) {
        // Обновляем существующий урок
        dayData.lessons[lessonIndex] = lessonData;
    } else {
        // Добавляем новый урок
        dayData.lessons.push(lessonData);
    }
    
    // Сохраняем в localStorage
    saveCustomSchedule();
    
    showNotification('Пара успешно сохранена (локально)', 'success');
    loadScheduleFromJSON();
}

// Функция для удаления пары
async function removeLesson(day, lessonNumber) {
    try {
        const user = localStorage.getItem('userRole') === 'admin' ? 'admin' : 'student';
        
        const response = await fetch(`${API_BASE}/schedule/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                day: day,
                lessonNumber: lessonNumber,
                group: currentGroup,
                building: currentBuilding,
                user: user
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Пара успешно удалена', 'success');
            loadScheduleFromJSON();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification('Ошибка удаления: ' + error.message, 'error');
        
        // Fallback: удаляем из localStorage
        removeFromLocalStorage(day, lessonNumber);
    }
}

// Fallback функция для удаления из localStorage
function removeFromLocalStorage(day, lessonNumber) {
    if (customScheduleData[currentGroup] && customScheduleData[currentGroup][currentBuilding]) {
        const dayData = customScheduleData[currentGroup][currentBuilding].find(d => d.day === day);
        
        if (dayData) {
            dayData.lessons = dayData.lessons.filter(l => l.number !== lessonNumber);
            
            // Если в дне не осталось уроков, удаляем день
            if (dayData.lessons.length === 0) {
                customScheduleData[currentGroup][currentBuilding] = customScheduleData[currentGroup][currentBuilding].filter(d => d.day !== day);
            }
            
            // Сохраняем изменения
            saveCustomSchedule();
            showNotification('Пара успешно удалена (локально)', 'success');
            loadScheduleFromJSON();
        }
    }
}

// Функция для получения данных пары для редактирования
function getLessonForEditing(day, lessonNumber) {
    // Сначала проверяем пользовательские данные
    if (customScheduleData[currentGroup] && customScheduleData[currentGroup][currentBuilding]) {
        const dayData = customScheduleData[currentGroup][currentBuilding].find(d => d.day === day);
        if (dayData) {
            const lesson = dayData.lessons.find(l => l.number === lessonNumber);
            if (lesson) return lesson;
        }
    }
    
    // Затем проверяем исходные данные из JSON
    return null;
}

// Функция для загрузки расписания из JSON
async function loadScheduleFromJSON() {
    try {
        const response = await fetch(`${API_BASE}/schedule`);
        const scheduleData = await response.json();
        const mergedData = getMergedSchedule(scheduleData);
        renderSchedule(mergedData);
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        // В случае ошибки отображаем пользовательские данные
        renderSchedule(getMergedSchedule({}));
    }
}

// Функция для отрисовки расписания
function renderSchedule(scheduleData) {
    const scheduleBody = document.getElementById('scheduleBody');
    scheduleBody.innerHTML = '';

    // Получаем данные для текущей группы и корпуса
    const groupData = scheduleData[currentGroup];
    const buildingSchedule = groupData ? groupData[currentBuilding] : null;

    // Создаем строки для каждого урока (1-8 уроки)
    for (let lessonNum = 1; lessonNum <= 8; lessonNum++) {
        const row = document.createElement('tr');
        
        // Добавляем ячейку с временем урока
        const timeCell = document.createElement('td');
        timeCell.className = 'time-column';
        
        timeCell.innerHTML = `
            <span class="lesson-number">${lessonNum} пара</span>
            <span class="time-cell">${lessonTimes[lessonNum]}</span>
        `;
        row.appendChild(timeCell);
        
        // Добавляем ячейки для каждого дня недели
        daysOfWeek.forEach(day => {
            const dayCell = document.createElement('td');
            dayCell.className = 'day-cell lesson-cell';
            
            // Находим урок для этого дня и номера пары
            let lesson = null;
            if (buildingSchedule) {
                const daySchedule = buildingSchedule.find(d => d.day === day);
                if (daySchedule && daySchedule.lessons) {
                    lesson = daySchedule.lessons.find(l => l.number === lessonNum);
                }
            }
            
            if (lesson) {
                const lessonType = lesson.type || 'lecture';
                const typeText = lessonType === 'practice' ? 'Практическая работа' : 
                               lessonType === 'lab' ? 'Лабораторная работа' : 'Лекция';
                
                dayCell.innerHTML = `
                    <div class="lesson-content">
                        <div class="room-number">${lesson.room}</div>
                        <div class="lesson-details">
                            <div class="subject-cell">${lesson.subject}</div>
                            <div class="teacher-cell">${lesson.teacher}</div>
                            <div class="lesson-type">${typeText}</div>
                        </div>
                    </div>
                    ${isAdminMode() ? `
                        <div class="admin-controls">
                            <button class="edit-btn" data-day="${day}" data-lesson="${lessonNum}">✏️</button>
                            <button class="remove-btn" data-day="${day}" data-lesson="${lessonNum}">🗑️</button>
                        </div>
                    ` : ''}
                `;
                
                // Добавляем класс для текущего дня
                if (isCurrentDay(day)) {
                    dayCell.classList.add('current-day');
                }
            } else {
                dayCell.innerHTML = `
                    <div class="no-lessons">нет занятий</div>
                    ${isAdminMode() ? `
                        <button class="add-lesson-btn" data-day="${day}" data-lesson="${lessonNum}">
                            + Добавить пару
                        </button>
                    ` : ''}
                `;
                dayCell.classList.add('empty-cell');
            }
            
            row.appendChild(dayCell);
        });
        
        scheduleBody.appendChild(row);
    }

    // Добавляем обработчики событий для административного режима
    if (isAdminMode()) {
        addAdminEventListeners();
    }
}

// Функция для добавления обработчиков событий администратора
function addAdminEventListeners() {
    // Обработчики для кнопок добавления пар
    document.querySelectorAll('.add-lesson-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const day = this.getAttribute('data-day');
            const lesson = parseInt(this.getAttribute('data-lesson'));
            openLessonModal(day, lesson);
        });
    });

    // Обработчики для кнопок редактирования
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.getAttribute('data-day');
            const lesson = parseInt(this.getAttribute('data-lesson'));
            openLessonModal(day, lesson, true);
        });
    });

    // Обработчики для кнопок удаления (теперь с подтверждением)
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.getAttribute('data-day');
            const lesson = parseInt(this.getAttribute('data-lesson'));
            removeLessonWithConfirmation(day, lesson);
        });
    });
}

// Функция для открытия модального окна пары
function openLessonModal(day, lessonNumber, isEdit = false) {
    currentEditDay = day;
    currentEditLesson = lessonNumber;
    
    const modal = document.getElementById('lessonModal');
    const title = document.getElementById('lessonModalTitle');
    const deleteBtn = document.getElementById('deleteLessonBtn');
    const form = document.getElementById('lessonForm');
    
    if (isEdit) {
        title.textContent = 'Редактировать пару';
        deleteBtn.style.display = 'block';
        
        // Заполняем форму данными существующей пары
        const lesson = getLessonForEditing(day, lessonNumber);
        if (lesson) {
            document.getElementById('teacherSearch').value = lesson.teacher;
            document.getElementById('subject').value = lesson.subject;
            document.getElementById('room').value = lesson.room;
            document.getElementById('lessonType').value = lesson.type || 'lecture';
        }
    } else {
        title.textContent = 'Добавить пару';
        deleteBtn.style.display = 'none';
        
        // Очищаем форму
        form.reset();
        document.getElementById('teacherResults').innerHTML = '';
        document.getElementById('teacherResults').style.display = 'none';
    }
    
    modal.style.display = 'block';
}

// Функция для поиска преподавателей
function searchTeachers(query) {
    const resultsContainer = document.getElementById('teacherResults');
    resultsContainer.innerHTML = '';
    
    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredTeachers = teachersData.filter(teacher => 
        teacher.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filteredTeachers.length > 0) {
        filteredTeachers.forEach(teacher => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div>${teacher.name}</div>
                <div class="teacher-info">Предметы: ${teacher.subjects.join(', ')}</div>
            `;
            item.addEventListener('click', function() {
                document.getElementById('teacherSearch').value = teacher.name;
                resultsContainer.style.display = 'none';
                
                // Автоматически выбираем первый предмет преподавателя
                const subjectSelect = document.getElementById('subject');
                if (teacher.subjects.length > 0) {
                    subjectSelect.value = teacher.subjects[0];
                }
            });
            resultsContainer.appendChild(item);
        });
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.style.display = 'none';
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

// Функция для подтверждения действия
function showConfirmation(message, callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="margin-bottom: 15px;">Подтверждение</h3>
        <p style="margin-bottom: 20px;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn cancel-btn" style="flex: 1;">Отмена</button>
            <button class="btn delete-btn" style="flex: 1;">Удалить</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Обработчики кнопок
    modal.querySelector('.cancel-btn').addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    modal.querySelector('.delete-btn').addEventListener('click', function() {
        document.body.removeChild(overlay);
        callback();
    });
}

// Обновленная функция удаления пары с подтверждением
function removeLessonWithConfirmation(day, lessonNumber) {
    showConfirmation('Вы уверены, что хотите удалить эту пару?', function() {
        removeLesson(day, lessonNumber);
    });
}

// Функция для просмотра журнала (для администраторов)
async function viewJournal() {
    if (isAdminMode()) {
        try {
            const response = await fetch(`${API_BASE}/journal`);
            const journal = await response.json();
            showJournalModal(journal);
        } catch (error) {
            console.error('Ошибка загрузки журнала:', error);
            showNotification('Ошибка загрузки журнала', 'error');
        }
    }
}

// Функция для отображения модального окна с журналом
function showJournalModal(journal) {
    // Создаем модальное окно для журнала
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let journalHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <h2>Журнал изменений</h2>
            <div style="margin-bottom: 15px;">
                <button class="btn" onclick="clearJournal()" style="background-color: #dc3545;">Очистить журнал</button>
            </div>
            <div class="journal-entries">
    `;
    
    if (journal.entries && journal.entries.length === 0) {
        journalHTML += '<p>Журнал пуст</p>';
    } else {
        journal.entries.forEach(entry => {
            journalHTML += `
                <div class="journal-entry" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${new Date(entry.timestamp).toLocaleString('ru-RU')}</strong>
                        <span style="color: ${entry.user === 'admin' ? '#dc3545' : '#0078cf'}">${entry.user}</span>
                    </div>
                    <div><strong>Действие:</strong> ${getActionText(entry.action)}</div>
                    <div><strong>Группа:</strong> ${entry.details.group}</div>
                    <div><strong>Корпус:</strong> ${entry.details.building}</div>
                    <div><strong>День:</strong> ${entry.details.day}</div>
                    <div><strong>Пара:</strong> ${entry.details.lessonNumber}</div>
                </div>
            `;
        });
    }
    
    journalHTML += `
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn cancel-btn" onclick="this.closest('.modal').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = journalHTML;
    document.body.appendChild(modal);
    
    // Закрытие при клике вне модального окна
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function getActionText(action) {
    const actions = {
        'ADD_LESSON': 'Добавление пары',
        'UPDATE_LESSON': 'Изменение пары', 
        'REMOVE_LESSON': 'Удаление пары'
    };
    return actions[action] || action;
}

// Функция для очистки журнала
async function clearJournal() {
    if (confirm('Вы уверены, что хотите очистить журнал?')) {
        try {
            const response = await fetch(`${API_BASE}/journal`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Журнал очищен', 'success');
                document.querySelector('.modal').remove();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка очистки журнала:', error);
            showNotification('Ошибка очистки журнала', 'error');
        }
    }
}

// Добавляем кнопку для просмотра журнала в интерфейс администратора
function addJournalButton() {
    if (isAdminMode()) {
        const header = document.querySelector('header');
        const existingJournalBtn = document.querySelector('.journal-btn');
        
        if (!existingJournalBtn) {
            const journalBtn = document.createElement('button');
            journalBtn.className = 'btn journal-btn';
            journalBtn.style.backgroundColor = '#17a2b8';
            journalBtn.textContent = 'Журнал';
            journalBtn.addEventListener('click', viewJournal);
            
            header.insertBefore(journalBtn, document.getElementById('registerBtn'));
        }
    }
}

// Инициализация функционала администратора
function initializeAdminFeatures() {
    const lessonModal = document.getElementById('lessonModal');
    const teacherSearch = document.getElementById('teacherSearch');
    const cancelLessonBtn = document.getElementById('cancelLessonBtn');
    const deleteLessonBtn = document.getElementById('deleteLessonBtn');
    const lessonForm = document.getElementById('lessonForm');
    
    // Поиск преподавателей
    teacherSearch.addEventListener('input', function() {
        searchTeachers(this.value);
    });
    
    // Закрытие результатов поиска при клике вне
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#teacherSearch') && !e.target.closest('#teacherResults')) {
            document.getElementById('teacherResults').style.display = 'none';
        }
    });
    
    // Закрытие модального окна пары
    cancelLessonBtn.addEventListener('click', function() {
        lessonModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === lessonModal) {
            lessonModal.style.display = 'none';
        }
    });
    
    // Удаление пары
    deleteLessonBtn.addEventListener('click', function() {
        if (currentEditDay && currentEditLesson) {
            removeLessonWithConfirmation(currentEditDay, currentEditLesson);
            lessonModal.style.display = 'none';
        }
    });
    
    // Сохранение пары
    lessonForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const teacher = document.getElementById('teacherSearch').value;
        const subject = document.getElementById('subject').value;
        const room = document.getElementById('room').value;
        const lessonType = document.getElementById('lessonType').value;
        
        if (!teacher || !subject || !room || !lessonType) {
            showNotification('Пожалуйста, заполните все поля', 'error');
            return;
        }
        
        // Сохраняем пару
        saveLesson(currentEditDay, currentEditLesson, teacher, subject, room, lessonType);
        
        // Закрываем модальное окно
        lessonModal.style.display = 'none';
    });
}

// Функция для проверки текущего дня
function isCurrentDay(dayName) {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const today = new Date().getDay();
    return days[today] === dayName;
}

// Функция для обновления отображения выбранной недели
function updateWeekDisplay() {
    const weekRangeElement = document.getElementById('weekRange');
    
    // Расчет дат для текущей недели с учетом смещения
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1 + (currentWeekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5);
    
    const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    };
    
    weekRangeElement.textContent = `Неделя ${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
}

// Функция для автоматического выбора группы ученика при загрузке
function initializeUserGroup() {
    const userRole = localStorage.getItem('userRole');
    
    if (userRole === 'student') {
        const userBuilding = localStorage.getItem('userBuilding');
        const userGroup = localStorage.getItem('userGroup');
        
        if (userBuilding && userGroup) {
            // Устанавливаем текущие значения
            currentBuilding = userBuilding;
            currentGroup = userGroup.toLowerCase();
            
            // Обновляем кнопки интерфейса
            const buildingBtn = document.getElementById('buildingBtn');
            const groupBtn = document.getElementById('groupBtn');
            
            if (buildingBtn && groupBtn) {
                const buildingNames = {
                    'a': 'Корпус А',
                    'y': 'Корпус У', 
                    'g': 'Корпус Г',
                    'k': 'Корпус К'
                };
                
                buildingBtn.textContent = buildingNames[userBuilding] || 'Корпус';
                groupBtn.textContent = userGroup;
            }
            
            showNotification(`Загружено расписание для группы ${userGroup}`, 'info');
        }
    }
}

// Обновленная функция инициализации выпадающих списков
function initializeDropdowns() {
    const buildingDropdown = document.getElementById('buildingDropdown');
    const groupDropdown = document.getElementById('groupDropdown');
    const groupContent = groupDropdown.querySelector('.dropdown-content');
    
    // Функция обновления списка групп
    function updateGroupList(building) {
        groupContent.innerHTML = '';
        const groups = buildingGroups[building] || [];
        
        groups.forEach(group => {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = group;
            link.setAttribute('data-value', group.toLowerCase());
            groupContent.appendChild(link);
        });

        // Добавляем обработчики для новых элементов
        addGroupListeners();
    }

    // Инициализируем список групп для стартового корпуса
    updateGroupList(currentBuilding);

    // Обработчик для корпуса
    buildingDropdown.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const building = this.getAttribute('data-value');
            currentBuilding = building;
            document.getElementById('buildingBtn').textContent = this.textContent;
            
            // Закрываем выпадающий список корпуса
            buildingDropdown.classList.remove('active');
            
            // Обновляем список групп для выбранного корпуса
            updateGroupList(building);
            loadScheduleFromJSON();
        });
    });

    // Общая логика для открытия/закрытия dropdown
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.btn');
        
        button.addEventListener('click', function() {
            dropdown.classList.toggle('active');
        });
        
        // Закрытие выпадающего списка при клике вне его
        document.addEventListener('click', function(event) {
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove('active');
            }
        });
    });
}

// Функция для добавления обработчиков групп
function addGroupListeners() {
    document.querySelectorAll('#groupDropdown .dropdown-content a').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            
            document.getElementById('groupBtn').textContent = text;
            document.getElementById('groupDropdown').classList.remove('active');
            
            currentGroup = value;
            loadScheduleFromJSON();
        });
    });
}

// Инициализация навигации по неделям
function initializeWeekNavigation() {
    document.querySelectorAll('.week-btn').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            if (index === 0) {
                currentWeekOffset--;
            } else {
                currentWeekOffset++;
            }
            
            updateWeekDisplay();
            loadScheduleFromJSON();
        });
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeUserGroup();
    initializeDropdowns();
    initializeWeekNavigation();
    updateWeekDisplay();
    loadScheduleFromJSON();
    initializeAdminFeatures();
    
    // Добавляем кнопку журнала после инициализации
    setTimeout(() => {
        addJournalButton();
    }, 100);
});

// Делаем функции глобальными для использования в HTML
window.clearJournal = clearJournal;
window.viewJournal = viewJournal;