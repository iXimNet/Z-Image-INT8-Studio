import { useEffect, useState, useRef, useCallback } from 'react'
import './ImageViewer.css'

const formatBytes = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const ImageViewer = ({ image, onClose, apiBase, onDelete }) => {
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [copied, setCopied] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [hoveringCanvas, setHoveringCanvas] = useState(false)
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
    const canvasRef = useRef(null)
    const imgRef = useRef(null)
    const fitZoomRef = useRef(1)

    if (!image) return null

    const imageUrl = `${apiBase}${image.image_url}`

    // On image load, compute the fit-to-view scale and initialise zoom to it.
    // After this, zoom=1 always means 100% actual pixels.
    const handleImageLoad = useCallback(() => {
        const img = imgRef.current
        const canvas = canvasRef.current
        if (!img || !canvas) return
        const nw = img.naturalWidth
        const nh = img.naturalHeight
        setNaturalSize({ w: nw, h: nh })
        const pad = 64
        const fitScale = Math.min(
            (canvas.clientWidth - pad) / nw,
            (canvas.clientHeight - pad) / nh,
            1   // never upscale beyond 100%
        )
        fitZoomRef.current = fitScale
        setZoom(fitScale)
        setOffset({ x: 0, y: 0 })
    }, [])

    const clampOffset = useCallback((newOffset, newZoom, nw, nh) => {
        const canvas = canvasRef.current
        if (!canvas || !nw) return { x: 0, y: 0 }
        const cw = canvas.clientWidth
        const ch = canvas.clientHeight
        const dispW = nw * newZoom
        const dispH = nh * newZoom
        if (dispW <= cw && dispH <= ch) return { x: 0, y: 0 }
        const maxPanX = Math.max(0, (dispW - cw) / 2)
        const maxPanY = Math.max(0, (dispH - ch) / 2)
        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, newOffset.x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, newOffset.y)),
        }
    }, [])

    const handleZoom = useCallback((delta) => {
        setZoom(prev => {
            const minZoom = Math.min(fitZoomRef.current * 0.5, 0.1)
            const next = Math.min(Math.max(prev + delta, minZoom), 5)
            return next
        })
    }, [])

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === '+' || e.key === '=') handleZoom(0.25)
            if (e.key === '-') handleZoom(-0.25)
            if (e.key === '0') { setZoom(1); setOffset({ x: 0, y: 0 }) }
        }
        window.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [onClose, handleZoom])

    // Mouse wheel zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.12 : 0.12
        setZoom(prev => {
            const minZoom = Math.min(fitZoomRef.current * 0.5, 0.1)
            return Math.min(Math.max(prev + delta, minZoom), 5)
        })
    }, [])

    // Drag (pan) handlers
    const handleMouseDown = useCallback((e) => {
        const canvas = canvasRef.current
        if (!canvas || !naturalSize.w) return
        const dispW = naturalSize.w * zoom
        const dispH = naturalSize.h * zoom
        if (dispW <= canvas.clientWidth && dispH <= canvas.clientHeight) return
        e.preventDefault()
        setIsDragging(true)
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }, [zoom, naturalSize, offset])

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return
        const newOffset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }
        setOffset(clampOffset(newOffset, zoom, naturalSize.w, naturalSize.h))
    }, [isDragging, dragStart, zoom, naturalSize, clampOffset])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            return () => {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    const handleDownload = () => {
        window.open(imageUrl, '_blank')
    }

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(image.prompt)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch { /* fallback: ignore */ }
    }

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true)
            return
        }
        try {
            await fetch(`${apiBase}/api/history/${image.id}`, { method: 'DELETE' })
            if (onDelete) onDelete(image.id)
            onClose()
        } catch { /* silent */ }
    }

    const resetZoom = () => {
        setZoom(1)
        setOffset({ x: 0, y: 0 })
    }

    const overflows = naturalSize.w ? (
        naturalSize.w * zoom > (canvasRef.current?.clientWidth ?? Infinity) ||
        naturalSize.h * zoom > (canvasRef.current?.clientHeight ?? Infinity)
    ) : zoom > 1
    const cursorStyle = overflows ? (isDragging ? 'grabbing' : 'grab') : 'default'

    return (
        <div className="viewer-overlay" onClick={onClose}>
            <div className="viewer-shell" onClick={e => e.stopPropagation()}>
                {/* Close */}
                <button className="viewer-close" onClick={onClose} title="关闭 (Esc)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Image Area */}
                <div
                    className="viewer-image-section"
                    onMouseEnter={() => setHoveringCanvas(true)}
                    onMouseLeave={() => setHoveringCanvas(false)}
                >
                    <div
                        ref={canvasRef}
                        className="viewer-canvas"
                        style={{ cursor: cursorStyle }}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt={image.prompt}
                            className="viewer-img"
                            style={{
                                width: naturalSize.w || 'auto',
                                height: naturalSize.h || 'auto',
                                maxWidth: 'none',
                                maxHeight: 'none',
                                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            }}
                            draggable={false}
                            onLoad={handleImageLoad}
                        />
                    </div>

                    {/* Zoom Controls — visible only on hover */}
                    <div className={`zoom-bar glass ${hoveringCanvas ? 'visible' : ''}`}>
                        <button className="zoom-btn" onClick={() => handleZoom(-0.25)} data-tooltip="缩小 (-)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                        <button className="zoom-btn" onClick={() => handleZoom(0.25)} data-tooltip="放大 (+)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <div className="zoom-sep" />
                        <button className="zoom-btn" onClick={resetZoom} data-tooltip="100% (0)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0115-6.7L21 8" />
                                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 01-15 6.7L3 16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Details Panel */}
                <div className="viewer-details">
                    <h3 className="details-heading">图像详情</h3>

                    {/* Prompt */}
                    <div className="detail-label-row">
                        <span className="detail-label">正向提示词</span>
                        <button className="copy-btn" onClick={handleCopyPrompt}>
                            {copied ? '✓ 已复制' : '复制'}
                        </button>
                    </div>
                    <p className="detail-body prompt-body">{image.prompt}</p>

                    {/* Negative Prompt */}
                    {image.negative_prompt && (
                        <>
                            <span className="detail-label">反向提示词</span>
                            <p className="detail-body">{image.negative_prompt}</p>
                        </>
                    )}

                    {/* Generation Parameters Grid */}
                    <span className="detail-label">生成参数</span>
                    <div className="meta-grid">
                        {image.width && image.height && (
                            <div className="meta-item">
                                <span className="meta-key">分辨率</span>
                                <span className="meta-val">{image.width}×{image.height}</span>
                            </div>
                        )}
                        {image.steps != null && (
                            <div className="meta-item">
                                <span className="meta-key">采样步数</span>
                                <span className="meta-val">{image.steps}</span>
                            </div>
                        )}
                        {image.guidance != null && (
                            <div className="meta-item">
                                <span className="meta-key">引导强度</span>
                                <span className="meta-val">{image.guidance}</span>
                            </div>
                        )}
                        {image.seed != null && (
                            <div className="meta-item">
                                <span className="meta-key">随机种子</span>
                                <span className="meta-val mono">{image.seed}</span>
                            </div>
                        )}
                        {image.file_size != null && (
                            <div className="meta-item">
                                <span className="meta-key">文件大小</span>
                                <span className="meta-val">{formatBytes(image.file_size)}</span>
                            </div>
                        )}
                    </div>

                    {/* Date & ID */}
                    <div className="meta-grid meta-grid-2col">
                        <div className="meta-item">
                            <span className="meta-key">创建时间</span>
                            <span className="meta-val">{new Date(image.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                        <div className="meta-item">
                            <span className="meta-key">任务 ID</span>
                            <span className="meta-val mono">{image.id.substring(0, 8)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="viewer-actions">
                        <button className="dl-btn" onClick={handleDownload}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            查看高清原图
                        </button>
                        <button
                            className={`delete-btn ${confirmDelete ? 'confirm' : ''}`}
                            onClick={handleDelete}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                            {confirmDelete ? '确认删除？' : '删除此图'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ImageViewer
