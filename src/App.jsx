import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { MemorySystem, SelfLearningAPI } from './MemorySystem'

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
    internetSearch: false
  })
  
  // 创建对话记忆系统和自我学习API实例
  const memorySystemRef = useRef(new MemorySystem())
  const selfLearningAPIRef = useRef(new SelfLearningAPI(axios, memorySystemRef.current))
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
      // 从记忆系统获取相关的历史记录
      const relevantMemory = memorySystemRef.current.getRelevantMemory(input);
      
      // 构建用户消息，明确要求联网搜索
      let userMessageContent = input;
      
      // 对于涉及实时信息的问题，添加明确的搜索提示
      const requiresRealTimeInfo = /(今天|现在|当前|最新|实时|日期|时间|新闻|天气)/i.test(input);
      if (requiresRealTimeInfo) {
        userMessageContent += "\n\n请务必通过联网搜索获取最新信息后再回答。";
      }
      
      // 如果启用深度思考，使用深度思考提示
      if (aiCapabilities.deepThinking) {
        userMessageContent = `请深入思考并逐步分析：${userMessageContent}`;
      }
      
      const userMessage = {
        role: 'user',
        content: userMessageContent
      };
      
      // 构建API调用的messages数组
      const apiMessages = [
        { 
          role: 'system', 
          content: `你是Test1，一个智能AI助手。${aiCapabilities.internetSearch ? '对于需要实时信息（如当前日期、新闻、天气等）的问题，请务必使用联网搜索功能获取最新信息后再回答。' : '请根据你的知识回答问题。'}${aiCapabilities.deepThinking ? '请对问题进行深入分析后再回答。' : ''}` 
        }
      ];
      
      // 添加相关记忆作为上下文
      if (relevantMemory.length > 0) {
        apiMessages.push({
          role: 'system',
          content: `以下是一些相关的历史对话，可能有助于回答当前问题：\n\n${relevantMemory.map(memory => 
            `用户：${memory.question}\n助手：${memory.answer}`
          ).join('\n\n')}\n\n请参考这些历史对话，但不要直接重复之前的回答，除非完全相关。`
        });
      }
      
      // 添加当前会话的历史消息
      apiMessages.push(...messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })));
      
      // 添加当前用户消息
      apiMessages.push(userMessage);
      
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: apiMessages,
          temperature: aiCapabilities.deepThinking ? 0.3 : 0.1,  // 启用深度思考时提高温度，促进思考
          max_tokens: 3000,  // 增加token限制以支持更详细的回答
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

      const aiMessageContent = response.data.choices[0].message.content;
      const aiMessage = {
        id: Date.now() + 1,
        text: aiMessageContent,
        sender: 'ai'
      }
      
      // 添加AI回复到当前会话
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: [...session.messages, aiMessage] } 
          : session
      ))
      
      // 将这次交互保存到记忆系统中
      memorySystemRef.current.addInteraction(input, aiMessageContent);
      
      // 在后台进行自我反思和学习
      if (aiCapabilities.deepThinking) {
        selfLearningAPIRef.current.learnFromInteraction(
          input, 
          aiMessageContent,
          import.meta.env.VITE_DEEPSEEK_API_KEY
        ).then(reflection => {
          if (reflection) {
            console.log('自我反思结果:', reflection);
          }
        }).catch(error => {
          console.error('自我反思失败:', error);
        });
      }
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

  // 已在textarea中使用内联onKeyPress处理函数，不再需要单独的handleKeyPress函数

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
          <div className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}>
            {sidebarCollapsed ? '>' : '<'}
          </div>
          <button className="new-session-btn" onClick={createNewSession} title="开启新会话">
            {sidebarCollapsed ? '+' : '开启新会话'}
          </button>
        </div>
        
        {!sidebarCollapsed && <div className="sessions-list">
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
                  R
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => deleteSession(session.id)}
                  title="删除"
                >
                  D
                </button>
              </div>
            </div>
          ))}
        </div>}
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
                  {aiCapabilities.deepThinking && <div className="thinking-text">深度思考中...</div>}
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
            <button 
              className="capability-btn"
              onClick={async () => {
                setIsLoading(true);
                try {
                  // 调用Flask API
                  const response = await axios.get('http://localhost:5000/api/data', {
                    params: { timestamp: Date.now() }
                  });
                  
                  // 创建一个系统消息显示API结果
                  const apiMessage = {
                    id: Date.now(),
                    text: `Flask API 响应: ${JSON.stringify(response.data, null, 2)}`,
                    sender: 'ai'
                  };
                  
                  // 添加API响应到当前会话
                  setSessions(prev => prev.map(session => 
                    session.id === currentSessionId 
                      ? { ...session, messages: [...session.messages, apiMessage] } 
                      : session
                  ));
                } catch (error) {
                  console.error('Flask API请求失败:', error);
                  const errorMessage = {
                    id: Date.now(),
                    text: `Flask API请求失败: ${error.message}`,
                    sender: 'ai'
                  };
                  
                  // 添加错误消息到当前会话
                  setSessions(prev => prev.map(session => 
                    session.id === currentSessionId 
                      ? { ...session, messages: [...session.messages, errorMessage] } 
                      : session
                  ));
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              测试Flask API
            </button>
          </div>
          <div className="input-row">
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
    </div>
  )
}

export default App
