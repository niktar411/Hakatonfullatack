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
    'a': ['А101', 'А102', 'А103'],
    'y': ['У201', 'У202', 'У203'],
    'g': ['Г301', 'Г302', 'Г303'],
    'k': ['К401', 'К402', 'К403']
};

// Переменные для хранения текущих выбранных значений
let currentGroup = 'а101'; // Изменено на первую группу корпуса А
let currentBuilding = 'a'; // Изменено на корпус А
let currentWeekOffset = 0;

// Функция для загрузки расписания из JSON
async function loadScheduleFromJSON() {
    try {
        const response = await fetch('schedule.json');
        const scheduleData = await response.json();
        renderSchedule(scheduleData);
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        // В случае ошибки отображаем пустое расписание
        renderSchedule({});
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
            dayCell.className = 'day-cell';
            
            // Находим урок для этого дня и номера пары
            let lesson = null;
            if (buildingSchedule) {
                const daySchedule = buildingSchedule.find(d => d.day === day);
                if (daySchedule && daySchedule.lessons) {
                    lesson = daySchedule.lessons.find(l => l.number === lessonNum);
                }
            }
            
            if (lesson) {
                dayCell.innerHTML = `
                    <div class="subject-cell">${lesson.subject}</div>
                    <div class="teacher-cell">${lesson.teacher}</div>
                    <div class="room-cell">${lesson.room}</div>
                `;
                
                // Добавляем класс для текущего дня
                if (isCurrentDay(day)) {
                    dayCell.classList.add('current-day');
                }
            } else {
                dayCell.classList.add('empty-cell');
            }
            
            row.appendChild(dayCell);
        });
        
        scheduleBody.appendChild(row);
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

        // Обновляем текст кнопки и значение
        if (groups.length > 0) {
            const firstGroup = groups[0];
            document.getElementById('groupBtn').textContent = firstGroup;
            currentGroup = firstGroup.toLowerCase();
        }
        
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
    initializeDropdowns();
    initializeWeekNavigation();
    updateWeekDisplay();
    loadScheduleFromJSON();
});