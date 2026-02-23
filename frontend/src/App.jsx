import { useState, useCallback, useRef } from 'react'
import GenerationForm from './components/GenerationForm'
import HistoryGallery from './components/HistoryGallery'
import ImageViewer from './components/ImageViewer'
import './App.css'

const API_BASE = 'http://localhost:8000'

function App() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const galleryRef = useRef(null)

  const handleTaskCreated = useCallback((taskData) => {
    setIsGenerating(true)
    // Directly insert the new task into the gallery — no full refetch needed
    if (galleryRef.current) {
      galleryRef.current.addNewTask(taskData)
    }
  }, [])

  const handleGeneratingChange = useCallback((generating) => {
    setIsGenerating(generating)
  }, [])

  return (
    <div className="app-shell">
      {/* Ambient floating orbs */}
      <div className="ambient-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="14" fill="url(#logo-grad)" />
                <text x="14" y="18.5" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="10" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">IXIM</text>
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ff007a" />
                    <stop offset="0.5" stopColor="#7928ca" />
                    <stop offset="1" stopColor="#0070f3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-text">
              <h1>Z-Image Studio</h1>
              <span className="brand-badge">INT8</span>
            </div>
          </div>

          <div className="header-right">
            <a href="https://github.com/iXimNet/Z-Image-INT8-Studio" target="_blank" rel="noopener" className="model-link" data-tooltip="查看 GitHub 代码库">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              GitHub
            </a>
            <a href="https://www.modelscope.cn/models/iximbox/Z-Image-INT8" target="_blank" rel="noopener" className="model-link" data-tooltip="查看模型详情">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              ModelScope
            </a>
          </div>
        </div>
      </header>

      {/* ===== MAIN — Merged Layout ===== */}
      <main className="app-main">
        <div className="app-layout">
          <div className="layout-left">
            <GenerationForm
              onTaskCreated={handleTaskCreated}
              apiBase={API_BASE}
              isGenerating={isGenerating}
            />
          </div>
          <div className="layout-right">
            <HistoryGallery
              ref={galleryRef}
              onSelectImage={setSelectedImage}
              apiBase={API_BASE}
              onGeneratingChange={handleGeneratingChange}
            />
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="app-footer">
        <span>Powered by <strong>Z-Image-INT8</strong> · Tongyi-MAI</span>
        <span className="footer-sep">·</span>
        <span>Apache-2.0</span>
      </footer>

      {/* ===== IMAGE VIEWER MODAL ===== */}
      {selectedImage && (
        <ImageViewer
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          apiBase={API_BASE}
          onDelete={() => {
            setSelectedImage(null)
            if (galleryRef.current) {
              galleryRef.current.removeTask(selectedImage.id)
            }
          }}
        />
      )}
    </div>
  )
}

export default App
