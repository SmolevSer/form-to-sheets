// accounts-balance-updater.js
// Скрипт для автоматического добавления строки с нулевым временем (00:00:00)
// и фиксации остатка на начало дня в таблицах счетов

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();
const cron = require('node-cron');

// ID основной Google-таблицы (где все листы счетов)
const MAIN_SPREADSHEET_ID = process.env.MAIN_SPREADSHEET_ID || 'ВАШ_ID_ОСНОВНОЙ_ТАБЛИЦЫ';

// Авторизация Google Service Account
function getGoogleAuth() {
  return new JWT({
    key: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).private_key : undefined,
    email: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS).client_email : undefined,
    keyFile: process.env.GOOGLE_CREDENTIALS ? undefined : './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// Получить остаток для новой строки (алгоритм с учетом "нулевых" дней)
async function getStartBalance(sheet) {
  await sheet.loadCells();
  const rows = await sheet.getRows();
  if (rows.length === 0) return 0;
  // Ищем последнюю строку
  let lastRow = rows[rows.length - 1];
  let lastDate = lastRow.get('Дата');
  let lastTime = lastDate.split(' ')[1];
  if (lastTime === '00:00:00') {
    // Если последняя строка с нулевым временем, берем остаток на начало дня
    return Number(lastRow.get('Остаток на начало дня')) || 0;
  } else {
    // Иначе берем остаток текущий
    return Number(lastRow.get('Остаток текущий')) || 0;
  }
}

// Добавить строку с нулевым временем
async function addZeroTimeRow(sheet, date, startBalance) {
  await sheet.addRow({
    'Дата': `${date} 00:00:00`,
    'Остаток на начало дня': startBalance,
    'Остаток текущий': startBalance
    // Остальные поля пустые
  });
}

// Основная функция для всех счетов
async function updateAllAccountsSheets() {
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth()+1).toString().padStart(2, '0')}.${today.getFullYear()}`;
  const auth = getGoogleAuth();

  const ACCOUNT_SHEET_NAMES = [
    'Касса',
    'ИП-7435',
    'ИП-3564',
    'ИП-Акбарс',
    'АНО-Сбер'
  ];

  for (const sheetName of ACCOUNT_SHEET_NAMES) {
    if (!sheetId) continue;
    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    // Проверяем, есть ли уже строка с сегодняшней датой и 00:00:00
    const zeroRow = rows.find(r => (r.get('Дата')||'').endsWith('00:00:00') && (r.get('Дата')||'').startsWith(dateStr));
    if (!zeroRow) {
      const startBalance = await getStartBalance(sheet);
      await addZeroTimeRow(sheet, dateStr, startBalance);
      console.log(`Добавлена строка 00:00:00 для счета ${sheetId}`);
    } else {
      console.log(`Строка 00:00:00 уже есть для счета ${sheetId}`);
    }
  }
}

// Запускать каждый день в полночь
cron.schedule('5 0 * * *', updateAllAccountsSheets);

// Для ручного запуска
if (require.main === module) {
  updateAllAccountsSheets().then(() => {
    console.log('Обновление завершено');
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
