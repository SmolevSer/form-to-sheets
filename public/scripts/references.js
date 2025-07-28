// Модуль для работы со справочниками

let articlesExpenseCategories = {};
let articlesIncomeCategories = {};
let contractorsCategories = {};

// Загрузка справочников
async function loadReferences() {
  try {
    console.log('Загружаем справочники...');
    
    const [expenseResponse, incomeResponse, contractorsResponse] = await Promise.all([
      fetch('/expense-articles'),
      fetch('/income-articles'),
      fetch('/contractors')
    ]);
    
    const expenseData = await expenseResponse.text();
    const incomeData = await incomeResponse.text();
    const contractorsData = await contractorsResponse.text();
    
    articlesExpenseCategories = parseArticlesData(expenseData);
    articlesIncomeCategories = parseArticlesData(incomeData);
    contractorsCategories = parseContractorsData(contractorsData);
    
    console.log('Справочники загружены');
    console.log('Статьи расходов:', articlesExpenseCategories);
    console.log('Статьи доходов:', articlesIncomeCategories);
    console.log('Контрагенты:', contractorsCategories);
    
    populateArticlesSelect('expense');
    populateArticlesSelect('income');
    populateContractorsSelect('expense');
    populateContractorsSelect('income');
    
  } catch (error) {
    console.error('Ошибка при загрузке справочников:', error);
  }
}

// Парсинг данных статей
function parseArticlesData(data) {
  const categories = {};
  const lines = data.split('\n');
  let currentCategory = '';
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    if (line.startsWith('###')) {
      currentCategory = line.replace('###', '').trim();
      categories[currentCategory] = [];
    } else if (line.startsWith('-')) {
      const article = line.replace('-', '').trim();
      if (currentCategory && article) {
        categories[currentCategory].push(article);
      }
    }
  });
  
  return categories;
}

// Парсинг данных контрагентов
function parseContractorsData(data) {
  const categories = {};
  const lines = data.split('\n');
  let currentCategory = '';
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    if (line.startsWith('###')) {
      currentCategory = line.replace('###', '').trim();
      categories[currentCategory] = [];
    } else if (line.startsWith('-')) {
      const contractor = line.replace('-', '').trim();
      if (currentCategory && contractor) {
        categories[currentCategory].push(contractor);
      }
    }
  });
  
  return categories;
}

// Заполнение select статей
function populateArticlesSelect(type) {
  const selectId = `article-${type}`;
  const select = document.getElementById(selectId);
  const categories = type === 'expense' ? articlesExpenseCategories : articlesIncomeCategories;
  
  select.innerHTML = '<option value="">-- Выберите статью --</option>';
  
  Object.keys(categories).forEach(category => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = category;
    
    categories[category].forEach(article => {
      const option = document.createElement('option');
      option.value = article;
      option.textContent = article;
      optgroup.appendChild(option);
    });
    
    select.appendChild(optgroup);
  });
}

// Заполнение select контрагентов
function populateContractorsSelect(type) {
  const selectId = `contractor-${type}`;
  const select = document.getElementById(selectId);
  
  select.innerHTML = '<option value="">-- Выберите контрагента --</option>';
  
  Object.keys(contractorsCategories).forEach(category => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = category;
    
    contractorsCategories[category].forEach(contractor => {
      const option = document.createElement('option');
      option.value = contractor;
      option.textContent = contractor;
      optgroup.appendChild(option);
    });
    
    select.appendChild(optgroup);
  });
}

// Поиск статей
function searchArticles(type, query) {
  const resultsContainer = document.getElementById(`search-results-article-${type}`);
  const categories = type === 'expense' ? articlesExpenseCategories : articlesIncomeCategories;
  
  if (!query || query.length < 2) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    return;
  }
  
  const results = [];
  Object.keys(categories).forEach(category => {
    categories[category].forEach(article => {
      if (article.toLowerCase().includes(query.toLowerCase())) {
        results.push({ article, category });
      }
    });
  });
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
  } else {
    const maxResults = 10;
    let html = '';
    
    results.slice(0, maxResults).forEach(result => {
      const highlightedArticle = result.article.replace(
        new RegExp(query, 'gi'),
        match => `<mark>${match}</mark>`
      );
      
      html += `
        <div class="search-result-item" onclick="selectSearchResult('article-${type}', '${result.article}')">
          <div class="search-article-name">${highlightedArticle}</div>
          <div class="search-category-name">${result.category}</div>
        </div>
      `;
    });
    
    if (results.length > maxResults) {
      html += `<div class="search-more-results">И еще ${results.length - maxResults} результатов...</div>`;
    }
    
    resultsContainer.innerHTML = html;
  }
  
  resultsContainer.style.display = 'block';
}

// Поиск контрагентов
function searchContractors(query, type) {
  const resultsContainer = document.getElementById(`search-results-contractor-${type}`);
  
  if (!query || query.length < 2) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    return;
  }
  
  const results = [];
  Object.keys(contractorsCategories).forEach(category => {
    contractorsCategories[category].forEach(contractor => {
      if (contractor.toLowerCase().includes(query.toLowerCase())) {
        results.push({ contractor, category });
      }
    });
  });
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
  } else {
    const maxResults = 10;
    let html = '';
    
    results.slice(0, maxResults).forEach(result => {
      const highlightedContractor = result.contractor.replace(
        new RegExp(query, 'gi'),
        match => `<mark>${match}</mark>`
      );
      
      html += `
        <div class="search-result-item" onclick="selectSearchResult('contractor-${type}', '${result.contractor}')">
          <div class="search-article-name">${highlightedContractor}</div>
          <div class="search-category-name">${result.category}</div>
        </div>
      `;
    });
    
    if (results.length > maxResults) {
      html += `<div class="search-more-results">И еще ${results.length - maxResults} результатов...</div>`;
    }
    
    resultsContainer.innerHTML = html;
  }
  
  resultsContainer.style.display = 'block';
}

// Выбор результата поиска
function selectSearchResult(fieldId, value) {
  const field = document.getElementById(fieldId);
  field.value = value;
  
  // Скрываем результаты поиска
  const resultsContainer = document.getElementById(`search-results-${fieldId}`);
  resultsContainer.innerHTML = '';
  resultsContainer.style.display = 'none';
  
  // Скрываем поиск
  const searchContainer = document.getElementById(`search-${fieldId}`);
  if (searchContainer) {
    searchContainer.classList.add('hidden');
  }
}

// Переключение видимости поиска
function toggleSearch(fieldId) {
  const searchContainer = document.getElementById(`search-${fieldId}`);
  searchContainer.classList.toggle('hidden');
  
  if (!searchContainer.classList.contains('hidden')) {
    const searchInput = searchContainer.querySelector('input');
    if (searchInput) {
      searchInput.focus();
    }
  }
}

// Показать поле добавления нового контрагента
function showAddContractor(type) {
  const container = document.getElementById(`add-contractor-${type}`);
  container.classList.toggle('hidden');
  
  if (!container.classList.contains('hidden')) {
    const input = document.getElementById(`new-contractor-${type}`);
    if (input) {
      input.focus();
    }
  }
}

// Добавить нового контрагента
async function addNewContractor(type) {
  const input = document.getElementById(`new-contractor-${type}`);
  const contractorName = input.value.trim();
  
  if (!contractorName) {
    alert('Введите название контрагента');
    return;
  }
  
  try {
    const response = await fetch('/add-contractor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: contractorName })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Добавляем в локальный список
      if (!contractorsCategories['Новые']) {
        contractorsCategories['Новые'] = [];
      }
      contractorsCategories['Новые'].push(contractorName);
      
      // Обновляем select
      populateContractorsSelect(type);
      
      // Выбираем новый контрагент
      const select = document.getElementById(`contractor-${type}`);
      select.value = contractorName;
      
      // Очищаем поле и скрываем форму
      input.value = '';
      document.getElementById(`add-contractor-${type}`).classList.add('hidden');
      
      alert('Контрагент успешно добавлен');
    } else {
      alert('Ошибка при добавлении контрагента: ' + result.message);
    }
  } catch (error) {
    console.error('Ошибка при добавлении контрагента:', error);
    alert('Ошибка при добавлении контрагента');
  }
}
