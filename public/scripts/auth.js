// Модуль аутентификации и управления сессиями

let currentUser = '';
let sessionTimerInterval;

// Проверка сессии при загрузке страницы
window.addEventListener('load', async function() {
  console.log('Страница загружена, проверяем сессию');
  try {
    const response = await fetch('/check-session');
    const result = await response.json();
    
    console.log('Результат проверки сессии:', result);
    
    if (result.success) {
      currentUser = result.user;
      document.getElementById('current-user-name').textContent = currentUser;
      showMainForm();
      await loadReferences();
      startSessionTimer();
    } else {
      showAuthForm();
    }
  } catch (error) {
    console.error('Ошибка при проверке сессии:', error);
    showAuthForm();
  }
});

// Показать форму авторизации
function showAuthForm() {
  document.getElementById('auth-form').classList.remove('hidden');
  document.getElementById('main-form').classList.add('hidden');
  
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
  }
}

// Показать основную форму
function showMainForm() {
  document.getElementById('auth-form').classList.add('hidden');
  document.getElementById('main-form').classList.remove('hidden');
}

// Таймер сессии
function startSessionTimer() {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
  }
  
  sessionTimerInterval = setInterval(async () => {
    try {
      const response = await fetch('/check-session');
      const result = await response.json();
      
      if (result.success && result.timeLeft) {
        const minutes = Math.floor(result.timeLeft / 60);
        const seconds = result.timeLeft % 60;
        document.getElementById('timer-display').textContent = 
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerDiv = document.getElementById('session-timer');
        if (result.timeLeft < 300) { // Менее 5 минут
          timerDiv.classList.add('warning');
        } else {
          timerDiv.classList.remove('warning');
        }
      } else {
        // Сессия истекла
        clearInterval(sessionTimerInterval);
        alert('Сессия истекла. Необходимо войти заново.');
        showAuthForm();
      }
    } catch (error) {
      console.error('Ошибка проверки сессии:', error);
    }
  }, 1000);
}

// Аутентификация пользователя
async function authenticate() {
  const login = document.getElementById('login').value;
  const password = document.getElementById('password').value;
  
  if (!login || !password) {
    document.getElementById('auth-error').textContent = 'Пожалуйста, введите логин и пароль';
    return;
  }
  
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      currentUser = result.user;
      document.getElementById('current-user-name').textContent = currentUser;
      showMainForm();
      await loadReferences();
      startSessionTimer();
      document.getElementById('auth-error').textContent = '';
    } else {
      document.getElementById('auth-error').textContent = result.message || 'Неверный логин или пароль';
    }
  } catch (error) {
    console.error('Ошибка при аутентификации:', error);
    document.getElementById('auth-error').textContent = 'Ошибка при аутентификации';
  }
}

// Выход из системы
async function logout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    if (result.success) {
      currentUser = '';
      showAuthForm();
    }
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  }
}
