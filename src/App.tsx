import { useState, useEffect, useCallback, useRef } from 'react'
import ColorAnalysis from './ColorAnalysis'

type Color = { r: number; g: number; b: number }
type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER'

const generateRandomColor = (): Color => ({
  r: Math.floor(Math.random() * 256),
  g: Math.floor(Math.random() * 256),
  b: Math.floor(Math.random() * 256),
})

// Helper to calculate score based on distance
const calculateStats = (target: Color, current: Color) => {
  const maxDist = Math.sqrt(255**2 + 255**2 + 255**2)
  const dist = Math.sqrt(
    (target.r - current.r)**2 + 
    (target.g - current.g)**2 + 
    (target.b - current.b)**2
  )
  const similarity = Math.max(0, 1 - dist / maxDist)
  return {
    similarity,
    percentage: (similarity * 100).toFixed(1)
  }
}

const hexToRgb = (hex: string): Color | null => {
  const cleanHex = hex.replace('#', '').trim()
  // Support 6 chars
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b }
  }
  // Support 3 chars
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b }
  }
  return null
}

function App() {
  const [gameState, setGameState] = useState<GameState>('MENU')
  const [score, setScore] = useState(0)

  const [tempThreshold, setTempThreshold] = useState('')

  // Settings & Persistence
  const [showSettings, setShowSettings] = useState(false)
  
  const handleOpenSettings = () => {
    setTempThreshold(String(scoreThreshold))
    setShowSettings(true)
  }

  const handleCloseSettings = () => {
    const val = parseFloat(tempThreshold)
    if (!isNaN(val) && val >= 50 && val <= 99.9) {
      setScoreThreshold(val)
    }
    setShowSettings(false)
  }

  const handleResetHighScore = () => {
    if (window.confirm('确定要重置最高分吗？此操作无法撤销。')) {
      setHighScore(0)
      localStorage.setItem('chroma_high_score', '0')
    }
  }

  const [showAnalysis, setShowAnalysis] = useState(false)
  const [blindMode, setBlindMode] = useState(() => {
    return localStorage.getItem('chroma_blind_mode') === 'true'
  })
  const [strictMode, setStrictMode] = useState(() => {
    const stored = localStorage.getItem('chroma_strict_mode')
    return stored === null ? true : stored === 'true'
  })
  const [scoreThreshold, setScoreThreshold] = useState(() => {
    const val = parseFloat(localStorage.getItem('chroma_score_threshold') || '90')
    return isNaN(val) ? 90 : val
  })
  const [timerDuration, setTimerDuration] = useState(() => {
    const val = parseInt(localStorage.getItem('chroma_timer_duration') || '30', 10)
    return isNaN(val) ? 30 : val
  })
  
  const [timeLeft, setTimeLeft] = useState(timerDuration)
  
  const [targetColor, setTargetColor] = useState<Color>({ r: 0, g: 0, b: 0 })
  const [userColor, setUserColor] = useState<Color>({ r: 0, g: 0, b: 0 })
  
  // Input state
  const [hexInputValue, setHexInputValue] = useState('#')
  const [isEditingHex, setIsEditingHex] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isResettingRef = useRef(true)

  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('chroma_high_score') || '0', 10)
  })

  const [history, setHistory] = useState<{ target: Color; user: Color }[]>([])

  const [hasLostFocus, setHasLostFocus] = useState(false)

  // Monitor window focus
  useEffect(() => {
    const handleBlur = () => {
      if (gameState === 'PLAYING') {
        setHasLostFocus(true)
      }
    }
    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [gameState])

  // Persist settings
  useEffect(() => {
    localStorage.setItem('chroma_blind_mode', String(blindMode))
  }, [blindMode])

  useEffect(() => {
    localStorage.setItem('chroma_strict_mode', String(strictMode))
  }, [strictMode])

  useEffect(() => {
    localStorage.setItem('chroma_score_threshold', String(scoreThreshold))
  }, [scoreThreshold])

  useEffect(() => {
    localStorage.setItem('chroma_timer_duration', String(timerDuration))
  }, [timerDuration])

  useEffect(() => {
    localStorage.setItem('chroma_high_score', String(highScore))
  }, [highScore])

  // Update high score in real-time
  useEffect(() => {
    if (score > highScore && (!hasLostFocus || !strictMode)) {
      setHighScore(score)
    }
  }, [score, highScore, hasLostFocus, strictMode])

  // Feedback animation state
  const [lastScore, setLastScore] = useState<number | string | null>(null)

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('').toUpperCase()
  }

  // Sync hex input from userColor when not editing
  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false
      return
    }
    if (!isEditingHex) {
      setHexInputValue(rgbToHex(userColor.r, userColor.g, userColor.b))
    }
  }, [userColor, isEditingHex])

  const startNewRound = useCallback(() => {
    isResettingRef.current = true
    setTargetColor(generateRandomColor())
    // Reset user color to black
    setUserColor({ r: 0, g: 0, b: 0 })
    setHexInputValue('#')
    setLastScore(null)
    // Focus input for next round
    // setTimeout(() => {
    //   inputRef.current?.focus()
    // }, 0)
  }, [])

  const startGame = () => {
    setScore(0)
    setHistory([])
    setHasLostFocus(false)
    setTimeLeft(timerDuration)
    setGameState('PLAYING')
    startNewRound()
  }

  const handleSubmit = () => {
    if (gameState !== 'PLAYING') return

    const { similarity, percentage } = calculateStats(targetColor, userColor)
    
    // Record history
    setHistory(prev => [...prev, { target: targetColor, user: userColor }])

    if (similarity > (scoreThreshold / 100)) {
      // Success: >Threshold match
      setScore(s => s + 1)
      setLastScore(`${percentage}%`)
      setTimeLeft(timerDuration) // Reset timer
    } else {
      // Failure
      setLastScore(`${percentage}%`)
      // No score added, no timer reset
    }

    // Small delay to show result then next round
    setTimeout(() => {
      startNewRound()
    }, 1500)
  }

  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0 && timerDuration > 0) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0) {
            setGameState('GAME_OVER')
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    } else if (timeLeft <= 0 && gameState === 'PLAYING' && timerDuration > 0) {
      setGameState('GAME_OVER')
    }
  }, [gameState, timeLeft, timerDuration])

  const handleSliderChange = (channel: 'r' | 'g' | 'b', value: number) => {
    setUserColor(prev => ({ ...prev, [channel]: value }))
  }

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInputValue(val)
    const rgb = hexToRgb(val)
    if (rgb) {
      setUserColor(rgb)
    }
  }

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleEndGame = () => {
    if (gameState === 'PLAYING') {
      setGameState('GAME_OVER')
    }
  }

  return (
    <div className="app-container">
      <header className="game-header">
        <div className="brand">
           <h1>CHROMA</h1>
        </div>
        <div className="header-right">
          <div className="header-highscore">
            <span className="hs-label">最高分</span>
            <span className="hs-value">{highScore}</span>
          </div>
          <button 
             className="settings-btn"
             onClick={handleOpenSettings}
             title="设置"
           >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
               <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.49l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
             </svg>
           </button>
        </div>
      </header>

      {showSettings && (
        <div className="modal-overlay" onClick={handleCloseSettings}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>设置</h2>
              <button className="close-btn" onClick={handleCloseSettings}>×</button>
            </div>
            <div className="modal-body">
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">盲猜模式</span>
                  <span className="setting-desc">提交前隐藏颜色</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={blindMode}
                    onChange={(e) => setBlindMode(e.target.checked)}
                  />
                  <span className="slider-toggle"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">严格模式</span>
                  <span className="setting-desc">失焦时不计分</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                  />
                  <span className="slider-toggle"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">合格阈值</span>
                  <span className="setting-desc">得分判定百分比 (%)</span>
                </div>
                <input 
                  type="number" 
                  min="50"
                  max="99"
                  step="0.1"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(e.target.value)}
                  onBlur={() => {
                     let val = parseFloat(tempThreshold)
                     // If invalid, reset to current stored valid threshold
                     if (isNaN(val) || val < 50 || val > 99.9) {
                        setTempThreshold(String(scoreThreshold))
                     } else {
                        // If valid, format it nicely
                        setTempThreshold(String(val))
                     }
                  }}
                  style={{ 
                    background: '#333', 
                    border: '1px solid #555', 
                    color: '#fff', 
                    padding: '0.5rem', 
                    borderRadius: '4px',
                    width: '80px',
                    textAlign: 'center',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">倒计时时长</span>
                  <span className="setting-desc">秒 (0 = 关闭)</span>
                </div>
                <input 
                  type="number" 
                  min="0"
                  max="600"
                  value={timerDuration}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0)
                    setTimerDuration(val)
                    if (gameState !== 'PLAYING') {
                      setTimeLeft(val)
                    } else if (val > 0 && timeLeft === 0) {
                      setTimeLeft(val)
                    }
                  }}
                  style={{ 
                    background: '#333', 
                    border: '1px solid #555', 
                    color: '#fff', 
                    padding: '0.5rem', 
                    borderRadius: '4px',
                    width: '80px',
                    textAlign: 'center',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div className="setting-item" style={{ borderTop: '1px solid #444', marginTop: '1rem', paddingTop: '1rem' }}>
                <div className="setting-info">
                  <span className="setting-label">数据管理</span>
                  <span className="setting-desc">清除所有记录</span>
                </div>
                <button 
                  onClick={handleResetHighScore}
                  style={{
                    background: '#ff4444',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  重置最高分
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalysis && (
        <div className="modal-overlay" onClick={() => setShowAnalysis(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>色彩分析</h2>
              <button className="close-btn" onClick={() => setShowAnalysis(false)}>×</button>
            </div>
            <div className="modal-body">
              <ColorAnalysis history={history} />
            </div>
          </div>
        </div>
      )}

      <main className="game-interface">
        {/* Dashboard Row: Values | Score | Time */}
        <div className="dashboard-row">
          <div className="stat-card value-display">
            <span className="stat-label">当前色值</span>
            <div className="stat-value font-mono">
              <input 
                ref={inputRef}
                type="text" 
                className="hex-input"
                value={hexInputValue}
                onChange={handleHexChange}
                onFocus={() => setIsEditingHex(true)}
                onBlur={() => setIsEditingHex(false)}
                onKeyDown={handleHexKeyDown}
                disabled={gameState !== 'PLAYING'}
                maxLength={7}
              />
            </div>
          </div>
          
          <div className="stat-card score-display">
            <span className="stat-label">得分</span>
            <div 
              className="stat-value"
              style={{ color: (hasLostFocus && strictMode) ? '#ff4444' : undefined }}
              title={(hasLostFocus && strictMode) ? '失去焦点，分数无效' : undefined}
            >
              {score.toString().padStart(5, '0')}
            </div>
          </div>

          <div className="stat-card timer-display">
             <span className="stat-label">时间</span>
             <div className="circular-timer">
                {timerDuration > 0 ? (
                  <>
                    <svg viewBox="0 0 36 36" className="timer-svg">
                      <path
                        className="timer-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="timer-progress"
                        strokeDasharray={`${(timeLeft / timerDuration) * 100}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        style={{ stroke: timeLeft < 10 ? 'var(--danger-color)' : 'var(--accent-color)' }}
                      />
                    </svg>
                    <span className="timer-text">{timeLeft}</span>
                  </>
                ) : (
                   <span className="timer-text" style={{ fontSize: '2rem' }}>∞</span>
                )}
             </div>
          </div>
        </div>

        {/* Control Deck: Sliders | Action | Monitor */}
        <div className="control-deck">
          <div className="sliders-section">
            <div className="slider-group">
              <div className="slider-header">
                <label className="red">红</label>
              </div>
              <input 
                type="range" min="0" max="255" 
                value={userColor.r} 
                onChange={(e) => handleSliderChange('r', Number(e.target.value))}
                className="modern-slider red"
                disabled={gameState !== 'PLAYING'}
              />
            </div>
            
            <div className="slider-group">
              <div className="slider-header">
                <label className="green">绿</label>
              </div>
              <input 
                type="range" min="0" max="255" 
                value={userColor.g} 
                onChange={(e) => handleSliderChange('g', Number(e.target.value))}
                className="modern-slider green"
                disabled={gameState !== 'PLAYING'}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label className="blue">蓝</label>
              </div>
              <input 
                type="range" min="0" max="255" 
                value={userColor.b} 
                onChange={(e) => handleSliderChange('b', Number(e.target.value))}
                className="modern-slider blue"
                disabled={gameState !== 'PLAYING'}
              />
            </div>
          </div>

          <div className="action-section" style={{ display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative' }}>
            <button 
              className="submit-fab" 
              onClick={gameState === 'MENU' || gameState === 'GAME_OVER' ? startGame : handleSubmit}
            >
              {gameState === 'PLAYING' ? (
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
            </button>
            
            {gameState === 'PLAYING' && (
              <button 
                className="end-game-btn"
                onClick={handleEndGame}
                title="提前结算"
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#333',
                  border: '1px solid #555',
                  color: '#aaa',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  zIndex: 10
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            )}
          </div>

          <div className="preview-section">
            <div className="monitor-container">
               {/* Split view: User vs Target */}
               {gameState === 'PLAYING' ? (
                 <>
                   <div 
                     className={`color-half user ${blindMode && !lastScore ? 'blind' : ''}`}
                     style={{ backgroundColor: `rgb(${userColor.r},${userColor.g},${userColor.b})` }}
                   >
                     <span className="half-label">你的</span>
                     {blindMode && !lastScore && <div className="blind-mask">?</div>}
                   </div>
                   <div 
                     className="color-half target" 
                     style={{ backgroundColor: `rgb(${targetColor.r},${targetColor.g},${targetColor.b})` }}
                   >
                     <span className="half-label">目标</span>
                     {lastScore !== null && (
                       <div style={{
                         position: 'absolute',
                         top: '50%',
                         left: '50%',
                         transform: 'translate(-50%, -50%)',
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                         color: '#fff',
                         zIndex: 10,
                         width: '100%',
                         textAlign: 'center'
                       }}>
                         <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1.2 }}>{lastScore}</span>
                         <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', opacity: 0.9, marginTop: '0.2rem' }}>
                           {rgbToHex(targetColor.r, targetColor.g, targetColor.b)}
                         </span>
                       </div>
                     )}
                   </div>
                 </>
               ) : (
                 <div className="menu-screen">
                    {gameState === 'GAME_OVER' ? (
                      <div className="game-over-msg">
                        <p className="sub-text">游戏结束</p>
                        <p className="final-score">{score}</p>
                        <button 
                          className="analysis-btn"
                          onClick={() => setShowAnalysis(true)}
                          style={{
                            marginTop: '1rem',
                            background: '#000',
                            border: '1px solid #333',
                            color: '#fff',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          查看分析
                        </button>
                      </div>
                    ) : (
                      <div className="start-msg">
                        <p>准备开始</p>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
