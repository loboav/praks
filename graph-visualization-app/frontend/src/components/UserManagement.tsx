import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/apiClient';

interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Форма добавления пользователя
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Viewer');

  // Форма смены пароля
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await apiClient.post('/api/auth/register', {
        username: newUsername,
        password: newPassword,
        role: newRole
      });

      if (response.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewRole('Viewer');
        setShowAddForm(false);
        loadUsers();
      } else {
        const data = await response.json();
        setError(data.message || 'Ошибка создания пользователя');
      }
    } catch (err) {
      setError('Ошибка создания пользователя');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/api/users/${userId}`);
      if (response.ok) {
        loadUsers();
      } else {
        const data = await response.json();
        setError(data.message || 'Ошибка удаления пользователя');
      }
    } catch (err) {
      setError('Ошибка удаления пользователя');
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      const response = await apiClient.put(`/api/users/${userId}/role`, { role: newRole });
      if (response.ok) {
        loadUsers();
      } else {
        const data = await response.json();
        setError(data.message || 'Ошибка изменения роли');
      }
    } catch (err) {
      setError('Ошибка изменения роли');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const response = await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword: newUserPassword
      });

      if (response.ok) {
        setCurrentPassword('');
        setNewUserPassword('');
        setPasswordSuccess('Пароль успешно изменен');
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        const data = await response.json();
        setPasswordError(data.message || 'Ошибка смены пароля');
      }
    } catch (err) {
      setPasswordError('Ошибка смены пароля');
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Секция учетной записи */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>👤 Учетная запись</h3>
        <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Имя пользователя:</strong> {currentUser?.username}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Роль:</strong> {currentUser?.role}
          </div>
        </div>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            style={{
              padding: '8px 16px',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Сменить пароль
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Текущий пароль
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Новый пароль
              </label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
              />
            </div>
            {passwordError && <div style={{ color: '#e53e3e', marginBottom: 12, fontSize: 14 }}>{passwordError}</div>}
            {passwordSuccess && <div style={{ color: '#38a169', marginBottom: 12, fontSize: 14 }}>{passwordSuccess}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  background: '#38a169',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewUserPassword('');
                  setPasswordError('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Секция управления пользователями (только для Admin) */}
      {isAdmin && (
        <div>
          <h3 style={{ margin: '0 0 16px' }}>👥 Управление пользователями</h3>
          
          {error && (
            <div style={{ padding: 12, background: '#fed7d7', color: '#c53030', borderRadius: 8, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '8px 16px',
                background: '#48bb78',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              + Добавить пользователя
            </button>
          ) : (
            <form onSubmit={handleAddUser} style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Пароль
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  Роль
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                >
                  <option value="Viewer">Viewer (просмотр)</option>
                  <option value="Editor">Editor (редактирование)</option>
                  <option value="Admin">Admin (администратор)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#48bb78',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewUsername('');
                    setNewPassword('');
                    setNewRole('Viewer');
                    setError('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Пользователь</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Роль</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Создан</th>
                  <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 12 }}>{user.username}</td>
                    <td style={{ padding: 12 }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        disabled={user.id === currentUser?.id}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #ddd',
                          fontSize: 14
                        }}
                      >
                        <option value="Viewer">Viewer</option>
                        <option value="Editor">Editor</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: 12, fontSize: 14, color: '#718096' }}>
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#fc8181',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13
                          }}
                        >
                          Удалить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
