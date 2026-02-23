import { useState, useRef } from 'react'
import './GenerationForm.css'

const PRESETS = [
    { label: '🐱 橘猫打盹', prompt: '一只橘猫趴在堆满旧书的木桌上打盹，午后阳光透过窗帘洒进来，暖色调，胶片风格，细腻毛发纹理，超高清', negative: '模糊，低质量，变形，伪影，多余肢体' },
    { label: '🏙️ 赛博城市', prompt: '赛博朋克风格的未来城市夜景，霓虹灯闪烁，飞行汽车穿梭，雨后湿润的街道反射着彩色光芒，8K超清', negative: '模糊，低分辨率，卡通，简笔画' },
    { label: '🌸 水墨山水', prompt: '中国传统水墨画风格，远山近水，云雾缭绕，岸边小桥流水人家，留白意境，宣纸质感', negative: '照片风格，写实，现代建筑，鲜艳色彩' },
    { label: '👤 电影肖像', prompt: 'A cinematic portrait of a young woman standing by the window, golden hour sunlight, shallow depth of field, film grain, ultra-detailed skin texture, photorealistic', negative: 'blurry, low quality, deformed, artifacts' },
    { label: '🌌 星空露营', prompt: '在高山草甸上搭着帐篷，银河横跨天际，星光璀璨，远处雪山轮廓，长曝光摄影风格，史诗级构图', negative: '白天，城市，模糊，噪点过多' },
]

const SIZES = [
    { label: '1:1', w: 1024, h: 1024 },
    { label: '3:4', w: 768, h: 1024 },
    { label: '4:3', w: 1024, h: 768 },
    { label: '16:9', w: 1280, h: 720 },
    { label: '9:16', w: 720, h: 1280 },
]

const GenerationForm = ({ onTaskCreated, apiBase, isGenerating }) => {
    const [prompt, setPrompt] = useState('')
    const [negativePrompt, setNegativePrompt] = useState('模糊，低质量，变形，伪影，多余肢体')
    const [seed, setSeed] = useState('')
    const [customW, setCustomW] = useState(1024)
    const [customH, setCustomH] = useState(1024)
    const [steps, setSteps] = useState(40)
    const [guidance, setGuidance] = useState(4.0)
    const [sizeIdx, setSizeIdx] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const promptRef = useRef(null)

    const randomSeed = () => setSeed(Math.floor(Math.random() * 999999))

    const applyPreset = (preset) => {
        setPrompt(preset.prompt)
        setNegativePrompt(preset.negative)
        promptRef.current?.focus()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!prompt.trim()) return
        setIsSubmitting(true)
        setError(null)

        try {
            const sz = sizeIdx >= 0 ? SIZES[sizeIdx] : { w: customW, h: customH }
            const response = await fetch(`${apiBase}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    negative_prompt: negativePrompt.trim(),
                    seed: seed === '' ? Math.floor(Math.random() * 999999) : Number(seed),
                    steps,
                    guidance,
                    width: sz.w,
                    height: sz.h,
                }),
            })
            if (!response.ok) throw new Error(`请求失败: ${response.statusText}`)
            const taskData = await response.json()
            onTaskCreated(taskData)
        } catch (err) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedSize = sizeIdx >= 0 ? SIZES[sizeIdx] : null

    return (
        <div className="gen-root">
            {/* Presets */}
            <div className="presets-row">
                {PRESETS.map((p, i) => (
                    <button key={i} className="preset-chip" onClick={() => applyPreset(p)} type="button">
                        {p.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="error-banner anim-fade-in">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    <span>{error}</span>
                    <button className="error-dismiss" onClick={() => setError(null)}>×</button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="gen-form">
                {/* Prompt */}
                <div className="field">
                    <div className="field-header">
                        <label htmlFor="prompt">正向提示词</label>
                        <span className="char-count">{prompt.length}</span>
                    </div>
                    <textarea
                        ref={promptRef}
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="描述你想要生成的图像内容，越详细越好..."
                        rows={5}
                        required
                        className="text-input focus-ring"
                    />
                </div>

                {/* Negative Prompt */}
                <div className="field">
                    <div className="field-header">
                        <label htmlFor="neg">反向提示词</label>
                        <span className="char-count">{negativePrompt.length}</span>
                    </div>
                    <textarea
                        id="neg"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="描述你不希望出现的内容..."
                        rows={1}
                        className="text-input focus-ring"
                    />
                </div>

                {/* Size — compact inline chips */}
                <div className="field">
                    <label>尺寸{selectedSize && <span className="size-hint">{selectedSize.w}×{selectedSize.h}</span>}</label>
                    <div className="size-chips">
                        {SIZES.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                className={`size-chip ${sizeIdx === i ? 'active' : ''}`}
                                onClick={() => setSizeIdx(i)}
                            >
                                {s.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`size-chip ${sizeIdx === -1 ? 'active' : ''}`}
                            onClick={() => setSizeIdx(-1)}
                        >
                            自定义
                        </button>
                    </div>
                    {sizeIdx === -1 && (
                        <div className="custom-size-row anim-fade-in">
                            <div className="custom-number-input">
                                <input
                                    type="number" min={64} max={2048} step={64} value={customW}
                                    onChange={e => setCustomW(Math.max(64, parseInt(e.target.value) || 64))}
                                    className="num-input-sm focus-ring" placeholder="宽"
                                />
                                <div className="step-controls">
                                    <button type="button" onClick={() => setCustomW(w => Math.min(2048, w + 64))}>▲</button>
                                    <button type="button" onClick={() => setCustomW(w => Math.max(64, w - 64))}>▼</button>
                                </div>
                            </div>
                            <span className="custom-sep">×</span>
                            <div className="custom-number-input">
                                <input
                                    type="number" min={64} max={2048} step={64} value={customH}
                                    onChange={e => setCustomH(Math.max(64, parseInt(e.target.value) || 64))}
                                    className="num-input-sm focus-ring" placeholder="高"
                                />
                                <div className="step-controls">
                                    <button type="button" onClick={() => setCustomH(h => Math.min(2048, h + 64))}>▲</button>
                                    <button type="button" onClick={() => setCustomH(h => Math.max(64, h - 64))}>▼</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Params — compact horizontal row */}
                <div className="params-row">
                    <div className="param-inline">
                        <label>种子</label>
                        <div className="seed-inline">
                            <input
                                type="number"
                                value={seed}
                                onChange={(e) => setSeed(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                placeholder="随机"
                                className="num-input-sm focus-ring"
                            />
                            <button type="button" className="dice-btn-sm" onClick={randomSeed} title="随机种子">🎲</button>
                        </div>
                    </div>
                    <div className="param-inline">
                        <label>步数 <span className="pv">{steps}</span></label>
                        <div className="slider-wrapper">
                            <input
                                type="range"
                                min={10} max={50}
                                value={steps}
                                onChange={(e) => setSteps(parseInt(e.target.value))}
                                className="range-sm"
                            />
                        </div>
                    </div>
                    <div className="param-inline">
                        <label>引导 <span className="pv">{guidance.toFixed(1)}</span></label>
                        <div className="slider-wrapper">
                            <input
                                type="range"
                                min={0} max={10} step={0.1}
                                value={guidance}
                                onChange={(e) => setGuidance(parseFloat(e.target.value))}
                                className="range-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting || isGenerating || !prompt.trim()}
                    className={`submit-btn ${(isSubmitting || isGenerating) ? 'is-loading' : ''}`}
                >
                    {(isSubmitting || isGenerating) ? (
                        <span className="btn-inner">
                            <span className="btn-spinner" />
                            {isSubmitting ? '提交中...' : '生成中...'}
                        </span>
                    ) : (
                        <span className="btn-inner">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            开始生成
                        </span>
                    )}
                </button>
            </form>
        </div>
    )
}

export default GenerationForm
