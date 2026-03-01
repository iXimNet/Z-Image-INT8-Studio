import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import './HistoryGallery.css'

const formatBytes = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const HistoryGallery = forwardRef(({ onSelectImage, apiBase, onGeneratingChange }, ref) => {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const intervalRef = useRef(null)
    const tasksRef = useRef(tasks)

    // Keep tasksRef in sync so the polling callback always sees the latest tasks
    useEffect(() => {
        tasksRef.current = tasks
    }, [tasks])

    // Expose methods for parent to insert/remove tasks without refetching
    useImperativeHandle(ref, () => ({
        addNewTask(task) {
            // Build a full-shape task object from the API response (which may be sparse)
            const fullTask = {
                id: task.id,
                status: task.status || 'pending',
                prompt: task.prompt || '',
                negative_prompt: task.negative_prompt || '',
                image_url: task.image_url || null,
                error_message: task.error_message || null,
                seed: task.seed ?? null,
                steps: task.steps ?? null,
                guidance: task.guidance ?? null,
                width: task.width ?? null,
                height: task.height ?? null,
                file_size: task.file_size ?? null,
                created_at: task.created_at || new Date().toISOString(),
            }
            setTasks(prev => [fullTask, ...prev])
        },
        removeTask(taskId) {
            setTasks(prev => prev.filter(t => t.id !== taskId))
        },
    }), [])

    // Initial fetch — only once
    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch(`${apiBase}/api/history`)
            if (!response.ok) throw new Error('无法获取历史记录')
            const data = await response.json()
            setTasks(data)
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [apiBase])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    // Poll only pending/processing tasks by their individual status endpoint
    const pollPendingTasks = useCallback(async () => {
        const currentTasks = tasksRef.current
        const pendingTasks = currentTasks.filter(
            t => t.status === 'pending' || t.status === 'processing'
        )
        if (pendingTasks.length === 0) return

        const results = await Promise.allSettled(
            pendingTasks.map(async (t) => {
                const res = await fetch(`${apiBase}/api/status/${t.id}`)
                if (!res.ok) return null
                return res.json()
            })
        )

        setTasks(prev => {
            let changed = false
            const updated = prev.map(task => {
                // Only update tasks that were polled
                const idx = pendingTasks.findIndex(p => p.id === task.id)
                if (idx === -1) return task

                const result = results[idx]
                if (result.status !== 'fulfilled' || !result.value) return task

                const fresh = result.value
                // Check if anything actually changed
                if (fresh.status !== task.status ||
                    fresh.image_url !== task.image_url ||
                    fresh.file_size !== task.file_size ||
                    fresh.error_message !== task.error_message) {
                    changed = true
                    return { ...task, ...fresh }
                }
                return task
            })
            return changed ? updated : prev
        })
    }, [apiBase])

    // Start/stop polling based on whether any tasks are pending
    useEffect(() => {
        const hasPending = tasks.some(t => t.status === 'pending' || t.status === 'processing')

        // Notify parent about generating status
        if (onGeneratingChange) {
            onGeneratingChange(hasPending)
        }

        if (hasPending && !intervalRef.current) {
            intervalRef.current = setInterval(pollPendingTasks, 2500)
        } else if (!hasPending && intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [tasks, pollPendingTasks, onGeneratingChange])

    const handleDelete = async (e, taskId) => {
        e.stopPropagation()
        if (deletingId) return
        setDeletingId(taskId)
        try {
            await fetch(`${apiBase}/api/history/${taskId}`, { method: 'DELETE' })
            setTasks(prev => prev.filter(t => t.id !== taskId))
        } catch { /* silent */ }
        setDeletingId(null)
    }

    const filtered = searchQuery.trim()
        ? tasks.filter(t => t.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
        : tasks

    if (loading && tasks.length === 0) {
        return (
            <div className="gallery-placeholder glass">
                <div className="loading-ring" />
                <p>正在加载画廊...</p>
            </div>
        )
    }

    if (error && tasks.length === 0) {
        return (
            <div className="gallery-placeholder glass error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p>加载失败: {error}</p>
                <button onClick={fetchHistory} className="retry-btn">重试</button>
            </div>
        )
    }

    if (tasks.length === 0) {
        return (
            <div className="gallery-placeholder glass empty-state">
                <div className="empty-visual">
                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </div>
                <h3>还没有作品</h3>
                <p>前往「创作」标签页，生成你的第一张 AI 画作吧！</p>
            </div>
        )
    }

    return (
        <div className="gallery anim-fade-in-up">
            {/* Header */}
            <div className="gallery-header">
                <h2 className="gallery-title">
                    我的画廊
                    <span className="gallery-total-count">{tasks.length}</span>
                </h2>
                <div className="gallery-search">
                    <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="search-input"
                        type="text"
                        placeholder="搜索提示词..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="gallery-grid stagger">
                {filtered.map((task) => (
                    <div
                        key={task.id}
                        className={`gallery-card status-${task.status}`}
                        onClick={() => task.status === 'completed' && task.image_url ? onSelectImage(task) : null}
                    >

                        {task.status === 'completed' && task.image_url ? (
                            <div className="card-image-wrap">
                                <img
                                    src={`${apiBase}${task.image_url}`}
                                    alt={task.prompt}
                                    loading="lazy"
                                    className="card-img"
                                />
                                <div className="card-hover-overlay">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                                    </svg>
                                    <span>查看大图</span>
                                </div>
                                {/* Bottom info: prompt + params */}
                                <div className="card-bottom-bar">
                                    <p className="card-prompt-text">{task.prompt.length > 35 ? task.prompt.substring(0, 35) + '...' : task.prompt}</p>
                                </div>
                                {/* Param tags */}
                                <div className="card-params-bar">
                                    {task.width && task.height && <span className="param-tag">{task.width}×{task.height}</span>}
                                    {task.steps && <span className="param-tag">步{task.steps}</span>}
                                    {task.guidance != null && <span className="param-tag">G{task.guidance}</span>}
                                    {task.seed != null && <span className="param-tag">S{task.seed}</span>}
                                    {task.file_size && <span className="param-tag">{formatBytes(task.file_size)}</span>}
                                </div>
                            </div>
                        ) : task.status === 'failed' ? (
                            <div className="card-status failed">
                                <button className="delete-card-btn" onClick={(e) => handleDelete(e, task.id)} aria-label="删除失败记录">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                <span>生成失败</span>
                                {task.error_message && <p className="error-detail">{task.error_message.substring(0, 50)}</p>}
                            </div>
                        ) : (
                            <div className="card-status generating">
                                <div className="gen-pulse-ring">
                                    <div className="gen-pulse-dot" />
                                </div>
                                <span>生成中...</span>
                                <p className="gen-prompt-hint">{task.prompt.substring(0, 25)}...</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="no-filter-result">
                    <p>当前筛选条件下没有结果</p>
                </div>
            )}
        </div>
    )
})

HistoryGallery.displayName = 'HistoryGallery'

export default HistoryGallery
