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
                <rect x="2" y="2" width="24" height="24" rx="7" fill="url(#logo-grad)" />
                <path d="M9 18L14 8L19 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.5 15H17.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="logo-grad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7c5cfc" />
                    <stop offset="1" stopColor="#34d399" />
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
