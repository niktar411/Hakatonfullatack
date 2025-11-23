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

// Функция для сохранения пользовательского расписания
function saveCustomSchedule() {
    localStorage.setItem('customScheduleData', JSON.stringify(customScheduleData));
}

// Функция для добавления/обновления пары
function saveLesson(day, lessonNumber, teacher, subject, room, lessonType) {
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
    
    showNotification('Пара успешно сохранена', 'success');
}

// Функция для удаления пары
function removeLesson(day, lessonNumber, cancellationReason = '') {
    if (customScheduleData[currentGroup] && customScheduleData[currentGroup][currentBuilding]) {
        const dayData = customScheduleData[currentGroup][currentBuilding].find(d => d.day === day);
        
        if (dayData) {
            // Если указана причина - помечаем как отмененную
            if (cancellationReason) {
                const cancelledLesson = {
                    number: lessonNumber,
                    cancelled: true,
                    cancellationReason: cancellationReason,
                    cancellationDate: new Date().toISOString(),
                    originalData: getLessonForEditing(day, lessonNumber) // сохраняем исходные данные
                };
                
                const lessonIndex = dayData.lessons.findIndex(l => l.number === lessonNumber);
                
                if (lessonIndex !== -1) {
                    // Обновляем существующий урок
                    dayData.lessons[lessonIndex] = { ...dayData.lessons[lessonIndex], ...cancelledLesson };
                } else {
                    // Добавляем запись об отмене
                    dayData.lessons.push(cancelledLesson);
                }
                
                showNotification('Пара успешно отменена', 'success');
            } else {
                // Полное удаление - убираем урок из расписания
                dayData.lessons = dayData.lessons.filter(l => l.number !== lessonNumber);
                
                // Если в дне не осталось уроков, удаляем день
                if (dayData.lessons.length === 0) {
                    customScheduleData[currentGroup][currentBuilding] = 
                        customScheduleData[currentGroup][currentBuilding].filter(d => d.day !== day);
                }
                
                showNotification('Пара полностью удалена', 'success');
            }
            
            saveCustomSchedule();
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
        const response = await fetch('schedule.json');
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

    const groupData = scheduleData[currentGroup];
    const buildingSchedule = groupData ? groupData[currentBuilding] : null;

    for (let lessonNum = 1; lessonNum <= 8; lessonNum++) {
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.className = 'time-column';
        timeCell.innerHTML = `
            <span class="lesson-number">${lessonNum} пара</span>
            <span class="time-cell">${lessonTimes[lessonNum]}</span>
        `;
        row.appendChild(timeCell);
        
        daysOfWeek.forEach(day => {
            const dayCell = document.createElement('td');
            dayCell.className = 'day-cell lesson-cell';
            
            let lesson = null;
            if (buildingSchedule) {
                const daySchedule = buildingSchedule.find(d => d.day === day);
                if (daySchedule && daySchedule.lessons) {
                    lesson = daySchedule.lessons.find(l => l.number === lessonNum);
                }
            }
            
            if (lesson) {
                // Проверяем, отменена ли пара
                if (lesson.cancelled) {
                    dayCell.classList.add('cancelled-lesson');
                    dayCell.innerHTML = `
                        <div class="lesson-content">
                            <div class="room-number cancelled-room">${lesson.room || '-'}</div>
                            <div class="lesson-details">
                                <div class="subject-cell cancelled-subject">${lesson.subject || 'Пара'}</div>
                                <div class="teacher-cell cancelled-teacher">${lesson.teacher || ''}</div>
                                <div class="lesson-type cancelled-type">${getLessonTypeText(lesson.type)}</div>
                                <div class="cancellation-info">
                                    <strong>ОТМЕНЕНО</strong>
                                    <div class="cancellation-reason">${lesson.cancellationReason || 'Причина не указана'}</div>
                                </div>
                            </div>
                        </div>
                        ${isAdminMode() ? `
                            <div class="admin-controls">
                                <button class="remove-btn" data-day="${day}" data-lesson="${lessonNum}" title="Полностью удалить">🗑️</button>
                            </div>
                        ` : ''}
                    `;
                } else {
                    // Обычная пара
                    const lessonType = lesson.type || 'lecture';
                    const typeText = getLessonTypeText(lessonType);
                    
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
                                <button class="edit-btn" data-day="${day}" data-lesson="${lessonNum}" title="Редактировать">✏️</button>
                                <button class="remove-btn" data-day="${day}" data-lesson="${lessonNum}" title="Отменить пару">🗑️</button>
                            </div>
                        ` : ''}
                    `;
                    
                    if (isCurrentDay(day)) {
                        dayCell.classList.add('current-day');
                    }
                }
            } else {
                // ИСПРАВЛЕННАЯ ЧАСТЬ: Отображение пустой ячейки с кнопкой добавления
                dayCell.innerHTML = `
                    <div class="no-lessons">нет занятий</div>
                    ${isAdminMode() ? `
                        <div style="text-align: center; margin-top: 5px;">
                            <button class="add-lesson-btn" data-day="${day}" data-lesson="${lessonNum}">
                                + Добавить пару
                            </button>
                        </div>
                    ` : ''}
                `;
                dayCell.classList.add('empty-cell');
            }
            
            row.appendChild(dayCell);
        });
        
        scheduleBody.appendChild(row);
    }

    if (isAdminMode()) {
        addAdminEventListeners();
    }
}

// Функция для получения текста типа занятия
function getLessonTypeText(lessonType) {
    switch (lessonType) {
        case 'practice': return 'Практическая работа';
        case 'lab': return 'Лабораторная работа';
        default: return 'Лекция';
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
            handleRemoveButtonClick(day, lesson);
        });
    });
}

function openLessonModal(day, lessonNumber, isEdit = false) {
    currentEditDay = day;
    currentEditLesson = lessonNumber;
    
    const modal = document.getElementById('lessonModal');
    const title = document.getElementById('lessonModalTitle');
    const deleteBtn = document.getElementById('deleteLessonBtn');
    const form = document.getElementById('lessonForm');
    
    // Обновляем информацию о паре
    updateLessonInfo(day, lessonNumber);
    
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

// Обновленная функция удаления пары с подтверждением и причиной
function removeLessonWithConfirmation(day, lessonNumber) {
    showCancellationDialog(day, lessonNumber);
}

// Новая функция для показа диалога отмены с указанием причины
function showCancellationDialog(day, lessonNumber) {
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
        <h3 style="margin-bottom: 15px;">Отмена пары</h3>
        <p style="margin-bottom: 10px;">Вы уверены, что хотите отменить эту пару?</p>
        <div class="form-group">
            <label for="cancellationReasonInput" style="display: block; margin-bottom: 8px; font-weight: 600;">Причина отмены:</label>
            <input type="text" id="cancellationReasonInput" placeholder="Укажите причину отмены" 
                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px;">
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn cancel-btn" style="flex: 1;">Отмена</button>
            <button class="btn delete-btn" style="flex: 1;">Отменить пару</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Фокусируемся на поле ввода
    setTimeout(() => {
        const reasonInput = modal.querySelector('#cancellationReasonInput');
        if (reasonInput) reasonInput.focus();
    }, 100);
    
    // Обработчики кнопок
    modal.querySelector('.cancel-btn').addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    modal.querySelector('.delete-btn').addEventListener('click', function() {
        const reasonInput = modal.querySelector('#cancellationReasonInput');
        const cancellationReason = reasonInput.value.trim();
        
        if (!cancellationReason) {
            showNotification('Пожалуйста, укажите причину отмены', 'error');
            return;
        }
        
        document.body.removeChild(overlay);
        removeLesson(day, lessonNumber, cancellationReason);
        loadScheduleFromJSON();
    });
    
    // Закрытие по клавише Esc
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
        }
    });
}

// Функция для отмены пары с указанием причины
function cancelLessonWithReason(day, lessonNumber) {
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
        <h3 style="margin-bottom: 15px;">Отмена пары</h3>
        <p style="margin-bottom: 10px;">Вы собираетесь отменить эту пару. Она останется в расписании с пометкой "Отменено".</p>
        <div class="form-group">
            <label for="cancellationReasonInput" style="display: block; margin-bottom: 8px; font-weight: 600;">Причина отмены:</label>
            <input type="text" id="cancellationReasonInput" placeholder="Укажите причину отмены" 
                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px;">
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn cancel-btn" style="flex: 1;">Отмена</button>
            <button class="btn delete-btn" style="flex: 1;">Отменить пару</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Фокусируемся на поле ввода
    setTimeout(() => {
        const reasonInput = modal.querySelector('#cancellationReasonInput');
        if (reasonInput) reasonInput.focus();
    }, 100);
    
    // Обработчики кнопок
    modal.querySelector('.cancel-btn').addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    modal.querySelector('.delete-btn').addEventListener('click', function() {
        const reasonInput = modal.querySelector('#cancellationReasonInput');
        const cancellationReason = reasonInput.value.trim();
        
        if (!cancellationReason) {
            showNotification('Пожалуйста, укажите причину отмены', 'error');
            return;
        }
        
        document.body.removeChild(overlay);
        removeLesson(day, lessonNumber, cancellationReason);
        loadScheduleFromJSON();
    });
    
    // Закрытие по клавише Esc
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
        }
    });
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
        
        // Закрываем модальное окно и обновляем расписание
        lessonModal.style.display = 'none';
        loadScheduleFromJSON();
    });
}

// Функция для полного удаления пары
function removeLessonCompletely(day, lessonNumber) {
    showConfirmation('Вы уверены, что хотите полностью удалить эту пару? Ячейка расписания будет освобождена.', function() {
        removeLesson(day, lessonNumber); // Без причины - полное удаление
        loadScheduleFromJSON();
    });
}

function handleRemoveButtonClick(day, lessonNumber) {
    const lesson = getLessonForEditing(day, lessonNumber);
    
    if (lesson && lesson.cancelled) {
        // Если пара уже отменена - предлагаем полное удаление
        removeLessonCompletely(day, lessonNumber);
    } else {
        // Если пара активна - предлагаем отмену с причиной
        cancelLessonWithReason(day, lessonNumber);
    }
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

    // Функция для автоматического обновления группы при смене корпуса
    function updateGroupForCurrentBuilding() {
        const groupBtn = document.getElementById('groupBtn');
        const currentGroupText = groupBtn.textContent;
        
        if (currentGroupText && currentGroupText !== 'Группа') {
            // Сохраняем цифровую часть группы
            const numericPart = currentGroupText.replace(/[АУГК]/gi, '');
            // Создаем новую группу с буквой выбранного корпуса
            const buildingLetters = {
                'a': 'А',
                'y': 'У', 
                'g': 'Г',
                'k': 'К'
            };
            const newGroup = (buildingLetters[currentBuilding] || 'А') + numericPart;
            
            // Обновляем кнопку группы
            groupBtn.textContent = newGroup;
            currentGroup = newGroup.toLowerCase();
            
            // Обновляем расписание
            loadScheduleFromJSON();
        }
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
            
            // Автоматически обновляем группу
            updateGroupForCurrentBuilding();
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

// Функция для автоматического обновления группы при смене корпуса
function updateGroupForCurrentBuilding() {
    const groupBtn = document.getElementById('groupBtn');
    const currentGroupText = groupBtn.textContent;
    
    if (currentGroupText && currentGroupText !== 'Группа') {
        // Сохраняем цифровую часть группы
        const numericPart = currentGroupText.replace(/[АУГК]/gi, '');
        // Создаем новую группу с буквой выбранного корпуса
        const buildingLetters = {
            'a': 'А',
            'y': 'У', 
            'g': 'Г',
            'k': 'К'
        };
        const newGroup = (buildingLetters[currentBuilding] || 'А') + numericPart;
        
        // Обновляем кнопку группы
        groupBtn.textContent = newGroup;
        currentGroup = newGroup.toLowerCase();
        
        // Обновляем расписание
        loadScheduleFromJSON();
    }
}

// Добавьте эту функцию в index.js

// Функция для обновления информации о паре в модальном окне
function updateLessonInfo(day, lessonNumber) {
    // Обновляем день недели
    document.getElementById('lessonDayInfo').textContent = day;
    
    // Обновляем номер пары
    document.getElementById('lessonNumberInfo').textContent = lessonNumber;
    
    // Обновляем время пары
    document.getElementById('lessonTimeInfo').textContent = lessonTimes[lessonNumber];
    
    // Вычисляем и обновляем дату
    const date = calculateDateForDay(day, currentWeekOffset);
    document.getElementById('lessonDateInfo').textContent = formatDate(date);
}

// Функция для вычисления даты по дню недели и смещению недели
function calculateDateForDay(dayName, weekOffset) {
    const daysMap = {
        'Понедельник': 1,
        'Вторник': 2,
        'Среда': 3,
        'Четверг': 4,
        'Пятница': 5,
        'Суббота': 6
    };
    
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 - воскресенье, 1 - понедельник, etc.
    
    // Вычисляем дату понедельника текущей недели
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Добавляем смещение недели и дня
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + (weekOffset * 7) + (daysMap[dayName] - 1));
    
    return targetDate;
}

// Функция для форматирования даты в формате дд.мм.гггг
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeUserGroup(); // Добавляем инициализацию группы пользователя
    initializeDropdowns();
    initializeWeekNavigation();
    updateWeekDisplay();
    loadScheduleFromJSON();
    initializeAdminFeatures();
});