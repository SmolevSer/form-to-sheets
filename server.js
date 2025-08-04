// ID основной Google-таблицы с листами счетов
// (объявление уже есть выше, не дублируем)

// Названия листов-счетов
const ACCOUNT_SHEET_NAMES = [
  'Касса',
  'ИП-7435',
  'ИП-3564',
  'ИП-Акбарс',
  'АНО-Сбер'
];

// Добавление операции в нужный лист счета с учетом правильного расчета остатков
async function addToAccountSheet(formData) {
    try {
        // Логируем входящие данные для диагностики
        console.log('addToAccountSheet formData:', JSON.stringify(formData));

        const serviceAccountAuth = new JWT({
            key: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).private_key : undefined,
            email: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).client_email : undefined,
            keyFile: process.env.GOOGLE_CREDENTIALS ? undefined : path.join(__dirname, 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        // Вспомогательная функция: получить строку с 00:00:00 текущего дня
        function getDayStartString(dateStr) {
            // dateStr: '2025-08-05T14:23:00' или '2025-08-05 14:23:00'
            if (!dateStr || typeof dateStr !== 'string') {
                console.error('getDayStartString: пустая или невалидная дата', dateStr);
                return '';
            }
            let d;
            try {
                d = new Date(dateStr.replace(' ', 'T'));
            } catch (e) {
                console.error('getDayStartString: ошибка преобразования даты', dateStr, e);
                return '';
            }
            if (isNaN(d.getTime())) {
                console.error('getDayStartString: некорректная дата', dateStr);
                return '';
            }
            return d.toISOString().slice(0, 10) + 'T00:00:00';
        }

        // Получить "Остаток на начало дня" из строки 00:00:00 текущего дня
        async function getStartOfDayBalance(sheet, dateStr) {
            const rows = await sheet.getRows();
            const dayStart = getDayStartString(dateStr);
            for (let i = 0; i < rows.length; i++) {
                const rowDate = rows[i]['Дата и время'];
                if (rowDate && (rowDate.startsWith(dayStart) || rowDate.startsWith(dayStart.replace('T', ' ')))) {
                    // Берем "Остаток на начало дня" из строки 00:00:00
                    const val = rows[i]['Остаток на начало дня'];
                    return val !== undefined && val !== null && val !== '' ? parseFloat(val) : 0;
                }
            }
            return 0;
        }

        // Получить "Остаток текущий" предыдущей строки (последней по времени)
        async function getPrevCurrentBalance(sheet) {
            const rows = await sheet.getRows();
            if (rows.length === 0) return 0;
            const last = rows[rows.length - 1];
            const val = last['Остаток текущий'];
            return val !== undefined && val !== null && val !== '' ? parseFloat(val) : 0;
        }

        // Добавить строку в лист счета с расчетом остатков
        async function addRowWithCorrectBalances(sheet, row) {
            const rows = await sheet.getRows();
            // 1. Определяем остаток на начало дня
            let startOfDayBalance = 0;
            const dayStart = getDayStartString(row['Дата и время']);
            let foundStartOfDay = false;
            for (let i = 0; i < rows.length; i++) {
                const rowDate = rows[i]['Дата и время'];
                if (rowDate && (rowDate.startsWith(dayStart) || rowDate.startsWith(dayStart.replace('T', ' ')))) {
                    startOfDayBalance = rows[i]['Остаток на начало дня'] !== undefined && rows[i]['Остаток на начало дня'] !== '' ? parseFloat(rows[i]['Остаток на начало дня']) : 0;
                    foundStartOfDay = true;
                    break;
                }
            }
            row['Остаток на начало дня'] = startOfDayBalance;

            // 2. Определяем остаток текущий
            let prevBalance = 0;
            if (rows.length > 0) {
                prevBalance = rows[rows.length - 1]['Остаток текущий'] !== undefined && rows[rows.length - 1]['Остаток текущий'] !== '' ? parseFloat(rows[rows.length - 1]['Остаток текущий']) : 0;
            }
            let prihod = parseFloat(row['Приход'] || 0) || 0;
            let rashod = parseFloat(row['Расход'] || 0) || 0;
            row['Остаток текущий'] = (prevBalance + prihod - rashod).toFixed(2);

            await sheet.addRow(row);
        }

        // Универсальная функция для добавления операции в нужный лист
        async function addOperationToSheet(sheet, row) {
            await addRowWithCorrectBalances(sheet, row);
        }

        // --- Операции ---
        if (formData.operation === 'Приход') {
            const sheet = doc.sheetsByTitle[formData.accountDebit];
            if (sheet) {
                const row = {
                    'Дата и время': formData.timestamp,
                    'Тип операции': formData.operation,
                    'Приход': formData.amount || '',
                    'Расход': '',
                    'Остаток на начало дня': '',
                    'Остаток текущий': '',
                    'Контрагент': formData.contractor || '',
                    'Статус': formData.status || 'активна',
                    'Комментарии': formData.comments || ''
                };
                await addOperationToSheet(sheet, row);
            }
        } else if (formData.operation === 'Расход') {
            const sheet = doc.sheetsByTitle[formData.accountDebit];
            if (sheet) {
                const row = {
                    'Дата и время': formData.timestamp,
                    'Тип операции': formData.operation,
                    'Приход': '',
                    'Расход': formData.amount || '',
                    'Остаток на начало дня': '',
                    'Остаток текущий': '',
                    'Контрагент': formData.contractor || '',
                    'Статус': formData.status || 'активна',
                    'Комментарии': formData.comments || ''
                };
                await addOperationToSheet(sheet, row);
            }
        } else if (formData.operation === 'Перевод между счетами') {
            // Списание — из accountDebit, приход — в accountCredit
            const sheetDebit = doc.sheetsByTitle[formData.accountDebit];
            const sheetCredit = doc.sheetsByTitle[formData.accountCredit];
            if (sheetDebit) {
                let rowDebit = {
                    'Дата и время': formData.timestamp,
                    'Тип операции': 'Перевод (списание)',
                    'Приход': '',
                    'Расход': formData.amount || '',
                    'Остаток на начало дня': '',
                    'Остаток текущий': '',
                    'Контрагент': formData.contractor || '',
                    'Статус': formData.status || 'активна',
                    'Комментарии': formData.comments || ''
                };
                await addOperationToSheet(sheetDebit, rowDebit);
            }
            if (sheetCredit) {
                let rowCredit = {
                    'Дата и время': formData.timestamp,
                    'Тип операции': 'Перевод (зачисление)',
                    'Приход': formData.amount || '',
                    'Расход': '',
                    'Остаток на начало дня': '',
                    'Остаток текущий': '',
                    'Контрагент': formData.contractor || '',
                    'Статус': formData.status || 'активна',
                    'Комментарии': formData.comments || ''
                };
                await addOperationToSheet(sheetCredit, rowCredit);
            }
        } else if (formData.operation === 'Перевод между СВОИМИ компаниями') {
            // Аналогично переводу между счетами
            const sheetDebit = doc.sheetsByTitle[formData.accountDebit];
            const sheetCredit = doc.sheetsByTitle[formData.accountCredit];
            if (sheetDebit) {
                let rowDebit = {
                    'Дата и время': formData.timestamp,
                    'Тип операции': 'Перевод между компаниями (списание)',
                    'Приход': '',
                    'Расход': formData.amount || '',
                    'Остаток на начало дня': '',
                    'Остаток текущий': '',
                    'Контрагент': formData.contractor || '',
                    'Статус': formData.status || 'активна',
                    'Комментарии': formData.comments || ''
                };
                await addOperationToSheet(sheetDebit, rowDebit);
            }
            if (sheetCredit) {
                let rowCredit = {
                    'Дата и время': formData.timestamp,
                    'Тип операции': 'Перевод между компаниями (зачисление)',
                    'Приход': formData.amount || '',
                    'Расход': '',
                    'Остаток на начало дня': '',
                    'Остаток текущий': '',
                    'Контрагент': formData.contractor || '',
                    'Статус': formData.status || 'активна',
                    'Комментарии': formData.comments || ''
                };
                await addOperationToSheet(sheetCredit, rowCredit);
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Ошибка при добавлении в лист счета:', error);
        return { success: false, error: error.message };
    }
}
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка сессий (рабочая версия)
app.use(session({
    secret: 'accounting-system-secret-key-2024',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 30 * 60 * 1000, // 30 минут (можете поставить 2 минуты для тестирования)
        httpOnly: false
    },
    name: 'connect.sid'
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Настройка Google Sheets (ваша оригинальная)
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Бухгалтеры из .env (ваши оригинальные)
const accountants = {
    [process.env.ACCOUNTANT_1_LOGIN]: process.env.ACCOUNTANT_1_PASSWORD,
    [process.env.ACCOUNTANT_2_LOGIN]: process.env.ACCOUNTANT_2_PASSWORD,
    [process.env.ACCOUNTANT_3_LOGIN]: process.env.ACCOUNTANT_3_PASSWORD,
};

console.log('Доступные бухгалтеры:', Object.keys(accountants).filter(key => key));

// Функция для чтения справочника (ваша оригинальная)
async function readReference(filename) {
    try {
        const data = await fs.readFile(path.join(__dirname, filename), 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error(`Ошибка чтения файла ${filename}:`, error);
        return [];
    }
}

// Функция для записи в справочник (ваша оригинальная)
async function writeReference(filename, data) {
    try {
        await fs.writeFile(path.join(__dirname, filename), data.join('\n'), 'utf8');
        return true;
    } catch (error) {
        console.error(`Ошибка записи файла ${filename}:`, error);
        return false;
    }
}

// Функция для добавления данных в Google Sheets (ваша оригинальная)
async function addToGoogleSheets(formData) {
    try {
        const serviceAccountAuth = new JWT({
            key: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).private_key : undefined,
            email: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).client_email : undefined,
            keyFile: process.env.GOOGLE_CREDENTIALS ? undefined : path.join(__dirname, 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0];

        // Формируем данные для записи (ваша оригинальная структура)
        const rowData = {
            'Дата и время': formData.timestamp,
            'Логин': formData.login,
            'Компания': formData.company,
            'Операция': formData.operation,
            'Счет списания': formData.accountDebit,
            'Сумма': formData.amount || '',
            'Дата оплаты': formData.paymentDate || '',
            'Дата начисления': formData.accrualDate || '',
            'Счет для зачисления': formData.accountCredit || '',
            'Комментарии': formData.comments || '',
            'Статья': formData.article || '',
            'Контрагент': formData.contractor || '',
            'Целевая компания': formData.targetCompany || '',
            'Статус': formData.status || 'активна'
        };

        await sheet.addRow(rowData);
        return { success: true };
    } catch (error) {
        console.error('Ошибка при добавлении в Google Sheets:', error);
        return { success: false, error: error.message };
    }
}

// Функция для пометки операции как удаленной (ваша оригинальная)
async function markOperationAsDeleted(operationId, timestamp) {
    try {
        const serviceAccountAuth = new JWT({
            key: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).private_key : undefined,
            email: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).client_email : undefined,
            keyFile: process.env.GOOGLE_CREDENTIALS ? undefined : path.join(__dirname, 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0];
        await sheet.loadCells();

        // Ищем строку по timestamp
        const rows = await sheet.getRows();
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].get('Дата и время') === timestamp) {
                rows[i].set('Статус', 'удалена');
                await rows[i].save();
                return { success: true };
            }
        }

        return { success: false, error: 'Операция не найдена' };
    } catch (error) {
        console.error('Ошибка при обновлении статуса операции:', error);
        return { success: false, error: error.message };
    }
}

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        req.session.lastActivity = new Date().toISOString();
        return next();
    } else {
        return res.status(401).json({ success: false, message: 'Необходима авторизация' });
    }
}

// НОВЫЕ МАРШРУТЫ ДЛЯ СЕССИЙ

// Маршрут для авторизации (обновленный для работы с вашими бухгалтерами)
app.post('/login', (req, res) => {
    console.log('Попытка входа:', req.body);
    const { login, password } = req.body;
    
    if (!login || !password) {
        return res.json({ success: false, message: 'Заполните все поля' });
    }
    
    if (accountants[login] && accountants[login] === password) {
        req.session.user = login;
        req.session.loginTime = new Date().toISOString();
        req.session.lastActivity = new Date().toISOString();
        
        console.log('Успешный вход для бухгалтера:', login);
        res.json({ success: true, user: login });
    } else {
        console.log('Неверные учетные данные для:', login);
        res.json({ success: false, message: 'Неверный логин или пароль' });
    }
});

// Маршрут для проверки сессии
app.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        const now = new Date();
        const lastActivity = new Date(req.session.lastActivity || req.session.loginTime);
        const timeDiff = now - lastActivity;
        
        if (timeDiff > 30 * 60 * 1000) { // 30 минут
            console.log('Сессия истекла для пользователя:', req.session.user);
            req.session.destroy();
            return res.json({ success: false, message: 'Сессия истекла' });
        }
        
        req.session.lastActivity = new Date().toISOString();
        
        res.json({ 
            success: true, 
            user: req.session.user,
            loginTime: req.session.loginTime,
            timeLeft: Math.floor((30 * 60 * 1000 - timeDiff) / 1000)
        });
    } else {
        res.json({ success: false });
    }
});

// Маршрут для выхода
app.post('/logout', (req, res) => {
    console.log('Выход пользователя:', req.session.user);
    req.session.destroy((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
        }
        res.json({ success: true });
    });
});

// ВАШИ ОРИГИНАЛЬНЫЕ МАРШРУТЫ (с добавлением requireAuth)

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Функция для чтения справочника с категориями (улучшенная версия)
async function readCategorizedReference(filename) {
    try {
        const data = await fs.readFile(path.join(__dirname, filename), 'utf8');
        const lines = data.split('\n').map(line => line.trim()).filter(line => line !== '');
        
        const categorized = {};
        let currentCategory = 'Без категории';
        
        lines.forEach(line => {
            if (line.startsWith('#')) {
                // Это категория
                currentCategory = line.substring(1).trim();
                if (!categorized[currentCategory]) {
                    categorized[currentCategory] = [];
                }
            } else if (line && !line.startsWith('#')) {
                // Это элемент категории
                if (!categorized[currentCategory]) {
                    categorized[currentCategory] = [];
                }
                categorized[currentCategory].push(line);
            }
        });
        
        // Если файл пустой или нет категорий, создаем дефолтную
        if (Object.keys(categorized).length === 0) {
            categorized['Общие'] = [];
        }
        
        return categorized;
    } catch (error) {
        console.error(`Ошибка чтения файла ${filename}:`, error);
        // Возвращаем дефолтную структуру при ошибке
        return {
            'Общие': [
                'Аренда офиса',
                'Коммунальные услуги',
                'Зарплата сотрудников',
                'Налоги и сборы'
            ]
        };
    }
}

// Получение статей расходов (обновленная версия)
app.get('/api/articles/expense', requireAuth, async (req, res) => {
    try {
        const articles = await readCategorizedReference('Справочник статьи расхода.txt');
        res.json({ success: true, data: articles });
    } catch (error) {
        console.error('Ошибка загрузки справочника расходов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки справочника',
            data: {
                'Общие': ['Аренда офиса', 'Коммунальные услуги', 'Зарплата сотрудников']
            }
        });
    }
});

// Получение статей доходов (обновленная версия)
app.get('/api/articles/income', requireAuth, async (req, res) => {
    try {
        const articles = await readCategorizedReference('Справочник статьи прихода.txt');
        res.json({ success: true, data: articles });
    } catch (error) {
        console.error('Ошибка загрузки справочника доходов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки справочника',
            data: {
                'Общие': ['Продажа товаров', 'Оказание услуг', 'Выполнение работ']
            }
        });
    }
});

// Получение контрагентов (обновленная версия)
app.get('/api/contractors', requireAuth, async (req, res) => {
    try {
        const contractors = await readCategorizedReference('Справочник контрагенты.txt');
        res.json({ success: true, data: contractors });
    } catch (error) {
        console.error('Ошибка загрузки справочника контрагентов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки справочника',
            data: {
                'Общие': ['ООО "Партнер А"', 'ИП Иванов И.И.', 'ООО "Поставщик"']
            }
        });
    }
});

// Функция для записи категоризированного справочника
async function writeCategorizedReference(filename, categorizedData) {
    try {
        const lines = [];
        
        Object.keys(categorizedData).forEach(category => {
            lines.push(`# ${category}`);
            categorizedData[category].forEach(item => {
                lines.push(item);
            });
            lines.push(''); // Пустая строка между категориями
        });
        
        await fs.writeFile(path.join(__dirname, filename), lines.join('\n'), 'utf8');
        return true;
    } catch (error) {
        console.error(`Ошибка записи файла ${filename}:`, error);
        return false;
    }
}

// Обновленное добавление нового контрагента
app.post('/api/contractors/add', requireAuth, async (req, res) => {
    try {
        const { contractor, category } = req.body;
        
        if (!contractor || !contractor.trim()) {
            return res.json({ success: false, message: 'Название контрагента не может быть пустым' });
        }

        const contractors = await readCategorizedReference('Справочник контрагенты.txt');
        
        // Проверяем, не существует ли уже такой контрагент
        let exists = false;
        Object.keys(contractors).forEach(cat => {
            if (contractors[cat].includes(contractor.trim())) {
                exists = true;
            }
        });
        
        if (exists) {
            return res.json({ success: false, message: 'Такой контрагент уже существует' });
        }

        // Определяем категорию (по умолчанию "Прочие")
        const targetCategory = category && category.trim() ? category.trim() : 'Прочие';
        
        if (!contractors[targetCategory]) {
            contractors[targetCategory] = [];
        }
        
        contractors[targetCategory].push(contractor.trim());
        
        const success = await writeCategorizedReference('Справочник контрагенты.txt', contractors);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Ошибка при сохранении' });
        }
    } catch (error) {
        console.error('Ошибка добавления контрагента:', error);
        res.json({ success: false, message: 'Произошла ошибка' });
    }
});

// Маршрут для отправки операции (ваш оригинальный)
app.post('/submit-operation', requireAuth, async (req, res) => {
    try {
        const formData = req.body;
        // Добавляем пользователя из сессии
        formData.login = req.session.user;
        if (!formData.status) {
            formData.status = 'активна';
        }
        // Сначала добавляем в журнал операций
        const result = await addToGoogleSheets(formData);
        // Если успешно — добавляем в лист счета
        if (result.success) {
            await addToAccountSheet(formData);
            res.json({ success: true, message: 'Операция успешно сохранена' });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (error) {
        console.error('Ошибка при сохранении операции:', error);
        res.json({ success: false, message: 'Произошла ошибка при сохранении операции' });
    }
});

// Маршрут для удаления операции (ваш оригинальный)
app.post('/delete-operation', requireAuth, async (req, res) => {
    try {
        const { operationId, timestamp } = req.body;
        
        const result = await markOperationAsDeleted(operationId, timestamp);
        
        if (result.success) {
            res.json({ success: true, message: 'Операция помечена как удаленная' });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (error) {
        console.error('Ошибка при удалении операции:', error);
        res.json({ success: false, message: 'Произошла ошибка при удалении операции' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});