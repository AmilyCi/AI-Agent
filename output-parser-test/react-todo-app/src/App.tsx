import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: number
}

type FilterType = 'all' | 'active' | 'completed'

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('react-todos')
    return saved ? JSON.parse(saved) : []
  })
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem('react-todos', JSON.stringify(todos))
  }, [todos])

  // 添加 Todo
  const addTodo = () => {
    const text = inputValue.trim()
    if (!text) return

    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: Date.now(),
    }

    setTodos(prev => [newTodo, ...prev])
    setInputValue('')
    inputRef.current?.focus()
  }

  // 删除 Todo（带动画）
  const deleteTodo = (id: number) => {
    setAnimatingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setTodos(prev => prev.filter(todo => todo.id !== id))
      setAnimatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }

  // 切换完成状态
  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  // 开始编辑
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id)
    setEditingText(todo.text)
  }

  // 保存编辑
  const saveEditing = () => {
    if (editingId === null) return
    const text = editingText.trim()
    if (!text) {
      deleteTodo(editingId)
    } else {
      setTodos(prev =>
        prev.map(todo =>
          todo.id === editingId ? { ...todo, text } : todo
        )
      )
    }
    setEditingId(null)
    setEditingText('')
  }

  // 清除已完成
  const clearCompleted = () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id)
    setAnimatingIds(prev => new Set([...prev, ...completedIds]))
    setTimeout(() => {
      setTodos(prev => prev.filter(todo => !todo.completed))
      setAnimatingIds(new Set())
    }, 300)
  }

  // 筛选
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  // 统计
  const totalCount = todos.length
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingId !== null) {
        saveEditing()
      } else {
        addTodo()
      }
    }
    if (e.key === 'Escape' && editingId !== null) {
      setEditingId(null)
      setEditingText('')
    }
  }

  return (
    <div className="app">
      <div className="container">
        {/* 头部 */}
        <header className="header">
          <h1 className="title">
            <span className="title-icon">✨</span>
            Todo List
          </h1>
          <p className="subtitle">高效管理你的每一天</p>
        </header>

        {/* 统计卡片 */}
        <div className="stats-container">
          <div className="stat-card stat-total">
            <div className="stat-number">{totalCount}</div>
            <div className="stat-label">全部</div>
          </div>
          <div className="stat-card stat-active">
            <div className="stat-number">{activeCount}</div>
            <div className="stat-label">进行中</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-number">{completedCount}</div>
            <div className="stat-label">已完成</div>
          </div>
        </div>

        {/* 输入区域 */}
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            className="todo-input"
            placeholder="添加新的待办事项..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="add-btn" onClick={addTodo} disabled={!inputValue.trim()}>
            <span className="btn-icon">+</span>
            添加
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="filter-bar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              📋 全部
            </button>
            <button
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              ⏳ 进行中
            </button>
            <button
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              ✅ 已完成
            </button>
          </div>
          {completedCount > 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              🗑️ 清除已完成
            </button>
          )}
        </div>

        {/* Todo 列表 */}
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {filter === 'all' ? '📝' : filter === 'active' ? '🎉' : '📭'}
              </div>
              <p className="empty-text">
                {filter === 'all'
                  ? '还没有待办事项，添加一个吧！'
                  : filter === 'active'
                  ? '所有任务都已完成，太棒了！'
                  : '还没有已完成的任务'}
              </p>
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${
                  animatingIds.has(todo.id) ? 'removing' : 'adding'
                }`}
              >
                <div className="todo-content">
                  <button
                    className={`checkbox ${todo.completed ? 'checked' : ''}`}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.completed && <span className="check-icon">✓</span>}
                  </button>

                  {editingId === todo.id ? (
                    <input
                      type="text"
                      className="edit-input"
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEditing}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="todo-text"
                      onDoubleClick={() => startEditing(todo)}
                      title="双击编辑"
                    >
                      {todo.text}
                    </span>
                  )}
                </div>

                <div className="todo-actions">
                  {editingId !== todo.id && (
                    <>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => startEditing(todo)}
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => deleteTodo(todo.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <footer className="footer">
          <p>💡 双击任务可编辑 · Enter 确认 · Esc 取消</p>
        </footer>
      </div>
    </div>
  )
}

export default App
