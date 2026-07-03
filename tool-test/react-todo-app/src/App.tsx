import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: number
}

type FilterType = 'all' | 'active' | 'completed'

const STORAGE_KEY = 'react-todo-app-data'

function loadTodos(): Todo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [inputText, setInputText] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  // 添加 todo
  const addTodo = () => {
    if (!inputText.trim()) return
    const newTodo: Todo = {
      id: Date.now(),
      text: inputText.trim(),
      completed: false,
      createdAt: Date.now(),
    }
    setTodos([newTodo, ...todos])
    setInputText('')
  }

  // 删除 todo（带动画）
  const removeTodo = (id: number) => {
    setRemovingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setTodos(todos.filter(t => t.id !== id))
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }

  // 切换完成状态
  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  // 开始编辑
  const startEdit = (id: number, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  // 保存编辑
  const saveEdit = (id: number) => {
    if (!editText.trim()) {
      setEditingId(null)
      return
    }
    setTodos(todos.map(t => t.id === id ? { ...t, text: editText.trim() } : t))
    setEditingId(null)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  // 清除已完成
  const clearCompleted = () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id)
    setRemovingIds(prev => {
      const next = new Set(prev)
      completedIds.forEach(id => next.add(id))
      return next
    })
    setTimeout(() => {
      setTodos(todos.filter(t => !t.completed))
      setRemovingIds(new Set())
    }, 300)
  }

  // 筛选后的 todos
  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  // 统计
  const totalCount = todos.length
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="app-container">
      <div className="todo-card">
        {/* 标题 */}
        <h1 className="todo-title">
          <span className="title-icon">✨</span>
          Todo List
          <span className="title-icon">✨</span>
        </h1>

        {/* 输入区域 */}
        <div className="input-area">
          <input
            type="text"
            className="todo-input"
            placeholder="添加新的待办事项..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
          />
          <button className="add-btn" onClick={addTodo} disabled={!inputText.trim()}>
            <span className="add-icon">＋</span> 添加
          </button>
        </div>

        {/* 筛选按钮 */}
        <div className="filter-bar">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部 <span className="filter-count">{totalCount}</span>
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            进行中 <span className="filter-count">{activeCount}</span>
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            已完成 <span className="filter-count">{completedCount}</span>
          </button>
        </div>

        {/* 统计信息 */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-number">{totalCount}</div>
            <div className="stat-label">总计</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-number stat-active">{activeCount}</div>
            <div className="stat-label">进行中</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-number stat-completed">{completedCount}</div>
            <div className="stat-label">已完成</div>
          </div>
          {totalCount > 0 && (
            <div className="stat-divider"></div>
          )}
          {totalCount > 0 && (
            <div className="stat-item">
              <div className="stat-number stat-progress">
                {Math.round((completedCount / totalCount) * 100)}%
              </div>
              <div className="stat-label">完成率</div>
            </div>
          )}
        </div>

        {/* 进度条 */}
        {totalCount > 0 && (
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}

        {/* Todo 列表 */}
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                {filter === 'completed' ? '🎯' : filter === 'active' ? '🎉' : '📝'}
              </span>
              <p>
                {filter === 'completed' ? '还没有完成的事项' : filter === 'active' ? '所有事项都已完成！' : '开始添加你的待办事项吧'}
              </p>
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${removingIds.has(todo.id) ? 'removing' : ''}`}
              >
                {/* 完成勾选 */}
                <button
                  className={`checkbox ${todo.completed ? 'checked' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.completed && <span className="check-mark">✓</span>}
                </button>

                {/* 文本 / 编辑 */}
                {editingId === todo.id ? (
                  <div className="edit-area">
                    <input
                      ref={editInputRef}
                      type="text"
                      className="edit-input"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(todo.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <button className="edit-save-btn" onClick={() => saveEdit(todo.id)}>保存</button>
                    <button className="edit-cancel-btn" onClick={cancelEdit}>取消</button>
                  </div>
                ) : (
                  <span
                    className={`todo-text ${todo.completed ? 'completed-text' : ''}`}
                    onDoubleClick={() => startEdit(todo.id, todo.text)}
                  >
                    {todo.text}
                  </span>
                )}

                {/* 操作按钮 */}
                {editingId !== todo.id && (
                  <div className="todo-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => startEdit(todo.id, todo.text)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => removeTodo(todo.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 底部操作 */}
        {completedCount > 0 && (
          <div className="footer-actions">
            <button className="clear-btn" onClick={clearCompleted}>
              清除已完成事项 ({completedCount})
            </button>
          </div>
        )}

        <div className="hint-text">双击事项文本可进入编辑模式</div>
      </div>
    </div>
  )
}

export default App
