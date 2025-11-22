// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JOURNAL_FILE = 'journal.json';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Для обслуживания статических файлов

// Вспомогательная функция для чтения журнала
async function readJournal() {
    try {
        const data = await fs.readFile(JOURNAL_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Если файл не существует, создаем пустой журнал
        return { entries: [] };
    }
}

// Вспомогательная функция для записи в журнал
async function writeJournal(journal) {
    await fs.writeFile(JOURNAL_FILE, JSON.stringify(journal, null, 2), 'utf8');
}

// Функция для добавления записи в журнал
async function addJournalEntry(action, details, user = 'unknown') {
    const journal = await readJournal();
    
    const entry = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        user: user,
        action: action,
        details: details
    };
    
    journal.entries.unshift(entry); // Добавляем в начало
    
    // Сохраняем только последние 1000 записей
    if (journal.entries.length > 1000) {
        journal.entries = journal.entries.slice(0, 1000);
    }
    
    await writeJournal(journal);
    return entry;
}

// API для получения расписания
app.get('/api/schedule', async (req, res) => {
    try {
        const data = await fs.readFile('schedule.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки расписания' });
    }
});

// API для сохранения изменений в расписании
app.post('/api/schedule/save', async (req, res) => {
    try {
        const { day, lessonNumber, teacher, subject, room, lessonType, group, building, action } = req.body;
        
        // Загружаем текущее расписание
        let scheduleData;
        try {
            const data = await fs.readFile('schedule.json', 'utf8');
            scheduleData = JSON.parse(data);
        } catch (error) {
            scheduleData = {};
        }
        
        // Инициализируем структуру данных если её нет
        if (!scheduleData[group]) scheduleData[group] = {};
        if (!scheduleData[group][building]) scheduleData[group][building] = [];
        
        // Находим день в данных
        let dayData = scheduleData[group][building].find(d => d.day === day);
        
        if (!dayData) {
            dayData = { day: day, lessons: [] };
            scheduleData[group][building].push(dayData);
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
        
        let journalAction;
        let journalDetails;
        
        if (lessonIndex !== -1) {
            // Обновляем существующий урок
            const oldLesson = dayData.lessons[lessonIndex];
            dayData.lessons[lessonIndex] = lessonData;
            
            journalAction = 'UPDATE_LESSON';
            journalDetails = {
                group: group,
                building: building,
                day: day,
                lessonNumber: lessonNumber,
                oldData: oldLesson,
                newData: lessonData
            };
        } else {
            // Добавляем новый урок
            dayData.lessons.push(lessonData);
            
            journalAction = 'ADD_LESSON';
            journalDetails = {
                group: group,
                building: building,
                day: day,
                lessonNumber: lessonNumber,
                data: lessonData
            };
        }
        
        // Сохраняем изменения в schedule.json
        await fs.writeFile('schedule.json', JSON.stringify(scheduleData, null, 2), 'utf8');
        
        // Добавляем запись в журнал
        await addJournalEntry(journalAction, journalDetails, req.body.user || 'unknown');
        
        res.json({ success: true, message: 'Изменения сохранены' });
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        res.status(500).json({ error: 'Ошибка сохранения изменений' });
    }
});

// API для удаления пары
app.post('/api/schedule/remove', async (req, res) => {
    try {
        const { day, lessonNumber, group, building } = req.body;
        
        // Загружаем текущее расписание
        let scheduleData;
        try {
            const data = await fs.readFile('schedule.json', 'utf8');
            scheduleData = JSON.parse(data);
        } catch (error) {
            scheduleData = {};
        }
        
        let removedLesson = null;
        
        if (scheduleData[group] && scheduleData[group][building]) {
            const dayData = scheduleData[group][building].find(d => d.day === day);
            
            if (dayData) {
                const lessonIndex = dayData.lessons.findIndex(l => l.number === lessonNumber);
                
                if (lessonIndex !== -1) {
                    removedLesson = dayData.lessons[lessonIndex];
                    dayData.lessons.splice(lessonIndex, 1);
                    
                    // Если в дне не осталось уроков, удаляем день
                    if (dayData.lessons.length === 0) {
                        scheduleData[group][building] = scheduleData[group][building].filter(d => d.day !== day);
                    }
                    
                    // Сохраняем изменения
                    await fs.writeFile('schedule.json', JSON.stringify(scheduleData, null, 2), 'utf8');
                    
                    // Добавляем запись в журнал
                    await addJournalEntry('REMOVE_LESSON', {
                        group: group,
                        building: building,
                        day: day,
                        lessonNumber: lessonNumber,
                        data: removedLesson
                    }, req.body.user || 'unknown');
                    
                    res.json({ success: true, message: 'Пара удалена' });
                    return;
                }
            }
        }
        
        res.status(404).json({ error: 'Пара не найдена' });
        
    } catch (error) {
        console.error('Ошибка удаления:', error);
        res.status(500).json({ error: 'Ошибка удаления пары' });
    }
});

// API для получения журнала
app.get('/api/journal', async (req, res) => {
    try {
        const journal = await readJournal();
        res.json(journal);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки журнала' });
    }
});

// API для очистки журнала
app.delete('/api/journal', async (req, res) => {
    try {
        await writeJournal({ entries: [] });
        res.json({ success: true, message: 'Журнал очищен' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка очистки журнала' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Доступен по адресу: http://localhost:${PORT}`);
});