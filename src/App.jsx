import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  // 从localStorage加载会话数据
  const [sessions, setSessions] = useState(() => {
    const savedSessions = localStorage.getItem('chatSessions')
    if (savedSessions) {
      return JSON.parse(savedSessions)
    }
    // 创建默认会话
    const defaultSession = {
      id: Date.now(),
      name: '新会话',
      messages: []
    }
    return [defaultSession]
  })
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const savedSessionId = localStorage.getItem('currentSessionId')
    return savedSessionId ? parseInt(savedSessionId) : Date.now()
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // 侧边栏默认折叠
  const [aiCapabilities, setAiCapabilities] = useState({ // AI能力设置
    deepThinking: false,
    internetSearch: true
  })
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  
  // 获取当前会话
  const currentSession = sessions.find(session => session.id === currentSessionId)
  const messages = currentSession ? currentSession.messages : []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
    // 将会话数据保存到localStorage
    localStorage.setItem('chatSessions', JSON.stringify(sessions))
    localStorage.setItem('currentSessionId', currentSessionId.toString())
  }, [sessions, currentSessionId])

  // 创建新会话
  const createNewSession = () => {
    const newSession = {
      id: Date.now(),
      name: '新会话',
      messages: []
    }
    setSessions(prev => [...prev, newSession])
    setCurrentSessionId(newSession.id)
  }

  // 切换会话
  const switchSession = (sessionId) => {
    setCurrentSessionId(sessionId)
  }

  // 删除会话
  const deleteSession = (sessionId) => {
    if (sessions.length <= 1) {
      alert('不能删除最后一个会话')
      return
    }
    
    const updatedSessions = sessions.filter(session => session.id !== sessionId)
    setSessions(updatedSessions)
    
    // 如果删除的是当前会话，切换到第一个会话
    if (sessionId === currentSessionId) {
      setCurrentSessionId(updatedSessions[0].id)
    }
  }

  // 重命名会话
  const renameSession = (sessionId, newName) => {
    if (newName.trim() === '') return
    
    setSessions(prev => prev.map(session => 
      session.id === sessionId ? { ...session, name: newName.trim() } : session
    ))
  }

  const handleSend = async () => {
    if (input.trim() === '') return
    
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user'
    }
    
    // 更新当前会话的消息
    setSessions(prev => prev.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: [...session.messages, userMessage] } 
        : session
    ))
    
    setInput('')
    setIsLoading(true)
    
    // 确保输入框保持焦点
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    try {
      // 构建用户消息，明确要求联网搜索
      const userMessage = {
        role: 'user',
        content: input
      };
      
      // 对于涉及实时信息的问题，添加明确的搜索提示
      const requiresRealTimeInfo = /(今天|现在|当前|最新|实时|日期|时间|新闻|天气)/i.test(input);
      if (requiresRealTimeInfo) {
        userMessage.content += "\n\n请务必通过联网搜索获取最新信息后再回答。";
      }
      
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { 
              role: 'system', 
              content: `你是Test1，一个智能AI助手。${aiCapabilities.internetSearch ? '对于需要实时信息（如当前日期、新闻、天气等）的问题，请务必使用联网搜索功能获取最新信息后再回答。' : '请根据你的知识回答问题。'}${aiCapabilities.deepThinking ? '请对问题进行深入分析后再回答。' : ''}` 
            },
            ...messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            userMessage
          ],
          temperature: 0.1,  // 降低温度，提高回答准确性
          search_internet: aiCapabilities.internetSearch,  // 根据用户选择配置联网搜索功能
          debug: true,  // 开启调试模式，获取详细搜索信息
          stream: false  // 关闭流式输出，获取完整响应
        },
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      // 输出调试信息
      console.log('DeepSeek API 响应:', response.data)

      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.choices[0].message.content,
        sender: 'ai'
      }
      
      // 添加AI回复到当前会话
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: [...session.messages, aiMessage] } 
          : session
      ))
    } catch (error) {
      console.error('API请求失败:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: '抱歉，API请求失败，请稍后重试。',
        sender: 'ai'
      }
      
      // 添加错误消息到当前会话
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: [...session.messages, errorMessage] } 
          : session
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend()
    }
  }

  // 自动调整textarea高度
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      // 重置高度以获取准确的scrollHeight
      textareaRef.current.style.height = 'auto'
      // 设置新高度
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // 监听输入变化，自动调整高度
  useEffect(() => {
    autoResizeTextarea()
  }, [input])

  return (
    <div className="app">
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>{!sidebarCollapsed && '会话'}</h2>
          <div className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '▶️' : '◀️'}
          </div>
          <button className="new-session-btn" onClick={createNewSession}>
            {sidebarCollapsed ? '+' : '+ 新会话'}
          </button>
        </div>
        
        <div className="sessions-list">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
            >
              <div 
                className="session-info" 
                onClick={() => switchSession(session.id)}
              >
                <div className="session-name">{session.name}</div>
                <div className="session-preview">
                  {session.messages.length > 0 
                    ? session.messages[session.messages.length - 1].text.slice(0, 20) + '...'
                    : '无消息'}
                </div>
              </div>
              <div className="session-actions">
                <button 
                  className="rename-btn"
                  onClick={() => {
                    const newName = prompt('输入新的会话名称:', session.name)
                    if (newName) renameSession(session.id, newName)
                  }}
                  title="重命名"
                >
                  ✏️
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => deleteSession(session.id)}
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-content">
            <div className="logo">
              <h1 className="logo-text">Test1</h1>
            </div>
          </div>
        </header>
        
        <div className={`chat-messages ${messages.length === 0 ? 'empty-chat' : ''}`}>
          {messages.length === 0 ? (
            <div className="empty-chat-message">
              <h3>开始新的对话</h3>
              <p>向 DeepSeek AI 提问任何问题</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  {message.text}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-content">
                <div className="loading-indicator">
                  <div className="infinity-symbol"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input">
          <div className="ai-capabilities">
            <button 
              className={`capability-btn ${aiCapabilities.deepThinking ? 'active' : ''}`}
              onClick={() => setAiCapabilities(prev => ({ ...prev, deepThinking: !prev.deepThinking }))}
              disabled={isLoading}
            >
              深度思考（测试）
            </button>
            <button 
              className={`capability-btn ${aiCapabilities.internetSearch ? 'active' : ''}`}
              onClick={() => setAiCapabilities(prev => ({ ...prev, internetSearch: !prev.internetSearch }))}
              disabled={isLoading}
            >
              联网搜索（测试）
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的问题..."
            disabled={isLoading}
            rows={1}
            style={{ resize: 'none', overflow: 'hidden' }}
          />
          <button onClick={handleSend} disabled={isLoading}>
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
