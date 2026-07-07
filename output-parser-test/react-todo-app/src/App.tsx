import { useState, useEffect, useRef } from 'react';
import './App.css';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'active' | 'completed';

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const addTodo = () => {
    if (inputValue.trim() === '') return;
    const newTodo: Todo = {
      id: Date.now(),
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTodos((prev) => [...prev, newTodo]);
    setInputValue('');
    setAddingId(newTodo.id);
    setTimeout(() => setAddingId(null), 300);
  };

  const deleteTodo = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
      setDeletingId(null);
    }, 300);
  };

  const toggleComplete = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditValue(todo.text);
  };

  const saveEdit = () => {
    if (editingId === null) return;
    if (editValue.trim() === '') {
      setEditingId(null);
      return;
    }
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === editingId ? { ...todo, text: editValue.trim() } : todo
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.filter((todo) => todo.completed).length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="app-container">
      <div className="todo-card">
        <h1 className="todo-title">✨ Todo List</h1>
        
        {/* Input Section */}
        <div className="input-section">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加新任务..."
            className="todo-input"
          />
          <button onClick={addTodo} className="add-button">
            添加
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            onClick={() => setFilter('all')}
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          >
            全部 ({todos.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`filter-button ${filter === 'active' ? 'active' : ''}`}
          >
            进行中 ({activeCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`filter-button ${filter === 'completed' ? 'active' : ''}`}
          >
            已完成 ({completedCount})
          </button>
        </div>

        {/* Todo List */}
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📝</span>
              <p className="empty-text">
                {filter === 'all'
                  ? '暂无任务，添加一个吧！'
                  : filter === 'active'
                  ? '没有进行中的任务'
                  : '没有已完成的任务'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`todo-item ${
                  todo.completed ? 'completed' : ''
                } ${deletingId === todo.id ? 'deleting' : ''} ${
                  addingId === todo.id ? 'adding' : ''
                }`}
              >
                {editingId === todo.id ? (
                  <div className="edit-section">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="edit-input"
                    />
                    <button onClick={saveEdit} className="save-button">
                      保存
                    </button>
                    <button onClick={cancelEdit} className="cancel-button">
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="checkbox"
                      onClick={() => toggleComplete(todo.id)}
                    >
                      {todo.completed && <span>✓</span>}
                    </div>
                    <span
                      className={`todo-text ${
                        todo.completed ? 'completed-text' : ''
                      }`}
                    >
                      {todo.text}
                    </span>
                    <div className="todo-actions">
                      <button
                        onClick={() => startEdit(todo)}
                        className="action-button edit"
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="action-button delete"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Statistics */}
        {todos.length > 0 && (
          <div className="statistics">
            <div className="stat-item">
              <span className="stat-number">{todos.length}</span>
              <span className="stat-label">总任务</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{activeCount}</span>
              <span className="stat-label">进行中</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{completedCount}</span>
              <span className="stat-label">已完成</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {todos.length > 0
                  ? Math.round((completedCount / todos.length) * 100)
                  : 0}
                %
              </span>
              <span className="stat-label">完成率</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
