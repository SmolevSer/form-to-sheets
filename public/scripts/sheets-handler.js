// Модуль для работы с Google Sheets и отправки данных

// Отправка формы
async function submitForm() {
  if (!validateForm()) {
    return;
  }
  
  const operationData = getOperationData();
  
  try {
    showMessage('Отправка данных...', 'info');
    
    const response = await fetch('/submit-operation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(operationData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showMessage('Операция успешно сохранена', 'success');
      addToHistory(operationData);
      resetForm();
    } else {
      showMessage('Ошибка при сохранении: ' + result.message, 'error');
    }
  } catch (error) {
    console.error('Ошибка при отправке:', error);
    showMessage('Ошибка при отправке данных', 'error');
  }
}

// Показать сообщение
function showMessage(text, type) {
  const messageDiv = document.getElementById('form-message');
  messageDiv.textContent = text;
  messageDiv.className = type;
  
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = '';
  }, 5000);
}

// Добавление операции в историю
function addToHistory(operationData) {
  operationCounter++;
  const historyItem = {
    id: operationCounter,
    ...operationData,
    deleted: false
  };
  
  operationsHistory.push(historyItem);
  updateHistoryTable();
  
  // Показываем секцию истории, если она скрыта
  document.getElementById('history-section').classList.remove('hidden');
}

// Обновление таблицы истории
function updateHistoryTable() {
  const tbody = document.getElementById('history-tbody');
  const noHistoryDiv = document.getElementById('no-history');
  
  if (operationsHistory.length === 0) {
    tbody.innerHTML = '';
    noHistoryDiv.style.display = 'block';
    return;
  }
  
  noHistoryDiv.style.display = 'none';
  
  tbody.innerHTML = operationsHistory.map(operation => {
    const rowClass = operation.deleted ? 'deleted-row' : '';
    
    // Формируем строку в зависимости от типа операции
    let details = '';
    if (operation.operation === 'Перевод между счетами') {
      details = `${operation.targetAccount}`;
    } else if (operation.operation === 'Перевод между СВОИМИ компаниями') {
      details = `${operation.targetCompany} (${operation.targetAccount})`;
    } else {
      details = `${operation.article || ''} / ${operation.contractor || ''}`;
    }
    
    const deleteButton = operation.deleted ? '' : 
      `<button class="delete-btn" onclick="deleteOperation(${operation.id})">Удалить</button>`;
    
    return `
      <tr class="${rowClass}">
        <td>${operation.company}</td>
        <td>${operation.operation}</td>
        <td>${operation.account}</td>
        <td>${operation.amount} ₽</td>
        <td>${operation.paymentDate}</td>
        <td colspan="2">${details}</td>
        <td>${deleteButton}</td>
      </tr>
    `;
  }).join('');
}

// Удаление операции
async function deleteOperation(operationId) {
  if (!confirm('Вы уверены, что хотите удалить эту операцию?')) {
    return;
  }
  
  const operation = operationsHistory.find(op => op.id === operationId);
  if (!operation) {
    return;
  }
  
  try {
    const response = await fetch('/delete-operation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        operationId: operationId,
        timestamp: operation.timestamp 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      operation.deleted = true;
      updateHistoryTable();
      showMessage('Операция удалена', 'success');
    } else {
      showMessage('Ошибка при удалении: ' + result.message, 'error');
    }
  } catch (error) {
    console.error('Ошибка при удалении:', error);
    showMessage('Ошибка при удалении операции', 'error');
  }
}
