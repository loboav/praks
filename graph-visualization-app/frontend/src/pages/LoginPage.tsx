import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Показываем сообщение об успешной регистрации
  useEffect(() => {
    const state = location.state as { message?: string };
    if (state?.message) {
      setSuccessMessage(state.message);
      // Очищаем state чтобы сообщение не появлялось при обновлении
      window.history.replaceState({}, document.title);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);
    setIsLoading(false);

    if (success) {
      navigate('/');
    } else {
      setError('Неверное имя пользователя или пароль');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Graph Visualization App</h1>
          <p>Вход в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {successMessage && (
            <div style={{ 
              padding: 12, 
              background: '#d4edda', 
              border: '1px solid #c3e6cb', 
              borderRadius: 8, 
              color: '#155724', 
              fontSize: 14, 
              textAlign: 'center' 
            }}>
              {successMessage}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>

          <div className="login-hint" style={{ marginTop: 16 }}>
            <small>
              Нет аккаунта? <Link to="/register" style={{ color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>Зарегистрироваться</Link>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}
