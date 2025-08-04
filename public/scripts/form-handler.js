// Модуль управления формой и пользовательским интерфейсом

let selectedCompany = '';
let selectedOperation = '';
let selectedAccount = '';
let operationsHistory = [];
let operationCounter = 0;

// Выбор компании
function selectCompany(company) {
  selectedCompany = company;
  // Обновляем активные кнопки
  document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-company-${getCompanyId(company)}`).classList.add('active');
  // Показываем секцию выбора операции
  document.getElementById('operation-section').classList.remove('hidden');
  // Обновляем опции счетов для переводов между компаниями
  updateTransferCompanyOptions();
  // Сбрасываем выбор операции и последующие секции
  resetFromOperation();
}
window.selectCompany = selectCompany;

// Получение ID компании для кнопок
function getCompanyId(company) {
  const mapping = {
    'Мозаика': 'mozaika',
    'Кампус': 'kampus',
    'Хай-Гора': 'haigora'
  };
  return mapping[company] || company.toLowerCase();
}

// Выбор операции
function selectOperation(operation) {
  selectedOperation = operation;
  // Обновляем активные кнопки в секции операций
  const operationSection = document.getElementById('operation-section');
  operationSection.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  // Показываем соответствующие секции
  hideAllOperationBlocks();
  if (operation === 'Перевод между счетами') {
    document.getElementById('account-section').classList.remove('hidden');
    updateAccountOptions();
  } else if (operation === 'Перевод между СВОИМИ компаниями') {
    document.getElementById('account-section').classList.remove('hidden');
    updateAccountOptions();
  } else {
    document.getElementById('account-section').classList.remove('hidden');
    updateAccountOptions();
  }
  // Сбрасываем выбор счета
  selectedAccount = '';
  const accountSection = document.getElementById('account-section');
  accountSection.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
}
window.selectOperation = selectOperation;

// Выбор счета
function selectAccount(account) {
  selectedAccount = account;
  // Обновляем активные кнопки в секции счетов
  const accountSection = document.getElementById('account-section');
  accountSection.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  // Показываем соответствующий блок операции
  showOperationBlock();
}
window.selectAccount = selectAccount;

// Показать соответствующий блок операции
function showOperationBlock() {
  hideAllOperationBlocks();
  
  const today = new Date().toISOString().split('T')[0];
  
  if (selectedOperation === 'Перевод между счетами') {
    document.getElementById('transfer-internal-block').classList.remove('hidden');
    document.getElementById('payment-date-internal').value = today;
    updateInternalTransferAccounts();
  } else if (selectedOperation === 'Перевод между СВОИМИ компаниями') {
    document.getElementById('transfer-company-block').classList.remove('hidden');
    document.getElementById('payment-date-company').value = today;
  } else if (selectedOperation === 'Расход') {
    document.getElementById('expense-block').classList.remove('hidden');
    document.getElementById('payment-date-expense').value = today;
    document.getElementById('accrual-date-expense').value = today;
  } else if (selectedOperation === 'Приход') {
    document.getElementById('income-block').classList.remove('hidden');
    document.getElementById('payment-date-income').value = today;
    document.getElementById('accrual-date-income').value = today;
  }
  
  document.getElementById('submit-section').classList.remove('hidden');
}

// Скрыть все блоки операций
function hideAllOperationBlocks() {
  document.getElementById('transfer-internal-block').classList.add('hidden');
  document.getElementById('transfer-company-block').classList.add('hidden');
  document.getElementById('expense-block').classList.add('hidden');
  document.getElementById('income-block').classList.add('hidden');
  document.getElementById('submit-section').classList.add('hidden');
}

// Обновление опций счетов
function updateAccountOptions() {
  // Здесь можно добавить логику для динамического обновления доступных счетов
  // в зависимости от выбранной компании
}

// Обновление опций для внутренних переводов
function updateInternalTransferAccounts() {
  const targetSelect = document.getElementById('target-account-internal');
  const accounts = ['Касса', 'ИП-3564', 'ИП-7435', 'ИП-Акбарс', 'АНО-Сбер'];
  
  targetSelect.innerHTML = '<option value="">-- Выберите счет --</option>';
  
  accounts.forEach(account => {
    if (account !== selectedAccount) {
      const option = document.createElement('option');
      option.value = account;
      option.textContent = account;
      targetSelect.appendChild(option);
    }
  });
}

// Обновление опций компаний для переводов
function updateTransferCompanyOptions() {
  const targetSelect = document.getElementById('target-company');
  const companies = ['Мозаика', 'Кампус', 'Хай-Гора'];
  
  targetSelect.innerHTML = '<option value="">-- Выберите компанию --</option>';
  
  companies.forEach(company => {
    if (company !== selectedCompany) {
      const option = document.createElement('option');
      option.value = company;
      option.textContent = company;
      targetSelect.appendChild(option);
    }
  });
}

// Сброс формы от операции
function resetFromOperation() {
  selectedOperation = '';
  selectedAccount = '';
  
  // Скрываем все секции после выбора компании
  document.getElementById('operation-section').classList.add('hidden');
  document.getElementById('account-section').classList.add('hidden');
  hideAllOperationBlocks();
  
  // Сбрасываем активные кнопки
  document.querySelectorAll('#operation-section .btn, #account-section .btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

// Полный сброс формы
function resetForm() {
  selectedCompany = '';
  selectedOperation = '';
  selectedAccount = '';
  
  // Сбрасываем все активные кнопки
  document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
  
  // Скрываем все секции
  document.getElementById('operation-section').classList.add('hidden');
  document.getElementById('account-section').classList.add('hidden');
  hideAllOperationBlocks();
  
  // Очищаем все поля ввода
  clearAllInputs();
}

// Очистка всех полей ввода
function clearAllInputs() {
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    if (input.type === 'text' || input.type === 'number' || input.type === 'date' || input.tagName === 'TEXTAREA') {
      input.value = '';
    } else if (input.tagName === 'SELECT') {
      input.selectedIndex = 0;
    }
  });
}

// Валидация формы
function validateForm() {
  if (!selectedCompany) {
    alert('Выберите компанию');
    return false;
  }
  
  if (!selectedOperation) {
    alert('Выберите тип операции');
    return false;
  }
  
  if (selectedOperation !== 'Перевод между счетами' && selectedOperation !== 'Перевод между СВОИМИ компаниями' && !selectedAccount) {
    alert('Выберите счет');
    return false;
  }
  
  // Специфичная валидация для каждого типа операции
  if (selectedOperation === 'Перевод между счетами') {
    return validateInternalTransfer();
  } else if (selectedOperation === 'Перевод между СВОИМИ компаниями') {
    return validateCompanyTransfer();
  } else if (selectedOperation === 'Расход') {
    return validateExpense();
  } else if (selectedOperation === 'Приход') {
    return validateIncome();
  }
  
  return true;
}

// Валидация внутреннего перевода
function validateInternalTransfer() {
  const amount = document.getElementById('amount-internal').value;
  const paymentDate = document.getElementById('payment-date-internal').value;
  const targetAccount = document.getElementById('target-account-internal').value;
  
  if (!amount || parseFloat(amount) <= 0) {
    alert('Введите корректную сумму');
    return false;
  }
  
  if (!paymentDate) {
    alert('Выберите дату оплаты');
    return false;
  }
  
  if (!targetAccount) {
    alert('Выберите счет для зачисления');
    return false;
  }
  
  if (!selectedAccount) {
    alert('Выберите счет списания');
    return false;
  }
  
  return true;
}

// Валидация перевода между компаниями
function validateCompanyTransfer() {
  const amount = document.getElementById('amount-company').value;
  const paymentDate = document.getElementById('payment-date-company').value;
  const targetCompany = document.getElementById('target-company').value;
  const targetAccount = document.getElementById('target-account-company').value;
  
  if (!amount || parseFloat(amount) <= 0) {
    alert('Введите корректную сумму');
    return false;
  }
  
  if (!paymentDate) {
    alert('Выберите дату оплаты');
    return false;
  }
  
  if (!targetCompany) {
    alert('Выберите компанию получатель');
    return false;
  }
  
  if (!targetAccount) {
    alert('Выберите счет для зачисления');
    return false;
  }
  
  if (!selectedAccount) {
    alert('Выберите счет списания');
    return false;
  }
  
  return true;
}

// Валидация расхода
function validateExpense() {
  const amount = document.getElementById('amount-expense').value;
  const paymentDate = document.getElementById('payment-date-expense').value;
  const accrualDate = document.getElementById('accrual-date-expense').value;
  const article = document.getElementById('article-expense').value;
  const contractor = document.getElementById('contractor-expense').value;
  
  if (!amount || parseFloat(amount) <= 0) {
    alert('Введите корректную сумму');
    return false;
  }
  
  if (!paymentDate) {
    alert('Выберите дату оплаты');
    return false;
  }
  
  if (!accrualDate) {
    alert('Выберите дату начисления');
    return false;
  }
  
  if (!article) {
    alert('Выберите статью');
    return false;
  }
  
  if (!contractor) {
    alert('Выберите контрагента');
    return false;
  }
  
  return true;
}

// Валидация прихода
function validateIncome() {
  const amount = document.getElementById('amount-income').value;
  const paymentDate = document.getElementById('payment-date-income').value;
  const accrualDate = document.getElementById('accrual-date-income').value;
  const article = document.getElementById('article-income').value;
  const contractor = document.getElementById('contractor-income').value;
  
  if (!amount || parseFloat(amount) <= 0) {
    alert('Введите корректную сумму');
    return false;
  }
  
  if (!paymentDate) {
    alert('Выберите дату оплаты');
    return false;
  }
  
  if (!accrualDate) {
    alert('Выберите дату начисления');
    return false;
  }
  
  if (!article) {
    alert('Выберите статью');
    return false;
  }
  
  if (!contractor) {
    alert('Выберите контрагента');
    return false;
  }
  
  return true;
}

// Формирование данных операции
function getOperationData() {
  const baseData = {
    company: selectedCompany,
    operation: selectedOperation,
    account: selectedAccount,
    user: currentUser,
    timestamp: new Date().toISOString()
  };
  
  if (selectedOperation === 'Перевод между счетами') {
    return {
      ...baseData,
      amount: document.getElementById('amount-internal').value,
      paymentDate: document.getElementById('payment-date-internal').value,
      targetAccount: document.getElementById('target-account-internal').value,
      comment: document.getElementById('comment-internal').value
    };
  } else if (selectedOperation === 'Перевод между СВОИМИ компаниями') {
    return {
      ...baseData,
      amount: document.getElementById('amount-company').value,
      paymentDate: document.getElementById('payment-date-company').value,
      targetCompany: document.getElementById('target-company').value,
      targetAccount: document.getElementById('target-account-company').value,
      comment: document.getElementById('comment-company').value
    };
  } else if (selectedOperation === 'Расход') {
    return {
      ...baseData,
      amount: document.getElementById('amount-expense').value,
      paymentDate: document.getElementById('payment-date-expense').value,
      accrualDate: document.getElementById('accrual-date-expense').value,
      article: document.getElementById('article-expense').value,
      contractor: document.getElementById('contractor-expense').value,
      comment: document.getElementById('comment-expense').value
    };
  } else if (selectedOperation === 'Приход') {
    return {
      ...baseData,
      amount: document.getElementById('amount-income').value,
      paymentDate: document.getElementById('payment-date-income').value,
      accrualDate: document.getElementById('accrual-date-income').value,
      article: document.getElementById('article-income').value,
      contractor: document.getElementById('contractor-income').value,
      comment: document.getElementById('comment-income').value
    };
  }
  
  return baseData;
}
