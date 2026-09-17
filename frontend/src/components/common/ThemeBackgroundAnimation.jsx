// ThemeBackgroundAnimation.jsx
// Fondo animado dinámico y de alto rendimiento según el tema activo:
// - Modo Cosmos (Saint Seiya): Canvas HTML5 con constelaciones míticas (Pegaso, Dragón, Cisne), paneo panorámico y estrellas titilantes.
// - Modo Ghibli: Canvas HTML5 procedural con hojas verdes asimétricas poligonales y pétalos de cerezo (sakura) en caída zigzagueante y brisa suave.

import { useEffect, useRef } from 'react'
import useThemeStore, { TEMAS } from '../../store/themeStore'

export default function ThemeBackgroundAnimation() {
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    let t = 0

    // ─────────────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN MODO GHIBLI (HOJAS POLIGONALES Y PÉTALOS DE SAKURA)
    // ─────────────────────────────────────────────────────────────────────────
    const numHojas = 28
    const numPetalos = 36

    // Paletas de color Ghibli
    const coloresHojas = [
      'rgba(56, 142, 60, 0.75)',   // Verde bosque
      'rgba(76, 175, 80, 0.70)',   // Verde hoja viva
      'rgba(129, 199, 132, 0.65)', // Verde claro / menta
      'rgba(104, 159, 56, 0.70)',  // Verde oliva suave
      'rgba(139, 195, 74, 0.65)',  // Verde lima suave
    ]
    const coloresVenas = [
      'rgba(30, 90, 35, 0.5)',
      'rgba(46, 125, 50, 0.5)',
      'rgba(76, 140, 70, 0.45)',
    ]
    const coloresPetalos = [
      'rgba(255, 182, 193, 0.75)', // Rosa claro
      'rgba(255, 192, 203, 0.70)', // Rosa sakura clásico
      'rgba(248, 187, 208, 0.80)', // Rosa pastel
      'rgba(244, 143, 177, 0.70)', // Rosa vibrante
      'rgba(252, 228, 236, 0.85)', // Blanco rosado suave
    ]

    // Generador de partículas de hoja verde
    const crearHoja = (startY = null) => ({
      tipo: 'hoja',
      x: Math.random() * (width + 100) - 50,
      y: startY !== null ? startY : Math.random() * (height + 100) - 50,
      size: Math.random() * 8 + 8, // 8px a 16px
      color: coloresHojas[Math.floor(Math.random() * coloresHojas.length)],
      veinColor: coloresVenas[Math.floor(Math.random() * coloresVenas.length)],
      vy: Math.random() * 1.0 + 0.8, // Velocidad de caída
      vx: Math.random() * 0.6 + 0.2, // Deriva por el viento hacia la derecha
      swaySpeed: Math.random() * 0.02 + 0.015,
      swayAmp: Math.random() * 1.6 + 0.8,
      flipSpeed: Math.random() * 0.03 + 0.02,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      angle: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    })

    // Generador de partículas de pétalo sakura (caída más lenta y zigzagueante)
    const crearPetalo = (startY = null) => ({
      tipo: 'petalo',
      x: Math.random() * (width + 100) - 50,
      y: startY !== null ? startY : Math.random() * (height + 100) - 50,
      size: Math.random() * 6 + 6, // 6px a 12px
      color: coloresPetalos[Math.floor(Math.random() * coloresPetalos.length)],
      vy: Math.random() * 0.6 + 0.4, // Caída más lenta y ligera
      vx: Math.random() * 0.4 + 0.1,
      swaySpeed: Math.random() * 0.035 + 0.025, // Zigzag más pronunciado
      swayAmp: Math.random() * 2.2 + 1.2,
      flipSpeed: Math.random() * 0.04 + 0.02,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      angle: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    })

    const particulasGhibli = [
      ...Array.from({ length: numHojas }).map(() => crearHoja()),
      ...Array.from({ length: numPetalos }).map(() => crearPetalo())
    ]

    // ─────────────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN MODO COSMOS (CONSTELACIONES Y ESTRELLAS)
    // ─────────────────────────────────────────────────────────────────────────
    const constelaciones = [
      // Pegaso
      {
        nombre: 'Pegaso',
        color: 'rgba(255, 215, 0, 0.45)',
        lineColor: 'rgba(229, 169, 60, 0.25)',
        ox: 0.18,
        oy: 0.25,
        puntos: [
          { x: 0, y: 0, r: 3.5, gold: true },
          { x: 75, y: -25, r: 2.8, gold: false },
          { x: 120, y: 35, r: 3.2, gold: true },
          { x: 45, y: 65, r: 3.0, gold: true },
          { x: -55, y: -45, r: 2.5, gold: false },
          { x: -90, y: -20, r: 3.0, gold: true },
          { x: 175, y: -10, r: 2.5, gold: false },
        ],
        lineas: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [0, 4], [4, 5],
          [1, 6],
        ],
      },
      // Dragón
      {
        nombre: 'Dragón',
        color: 'rgba(96, 165, 250, 0.5)',
        lineColor: 'rgba(59, 130, 246, 0.22)',
        ox: 0.58,
        oy: 0.20,
        puntos: [
          { x: 0, y: 0, r: 3.2, gold: false },
          { x: 45, y: 25, r: 2.6, gold: true },
          { x: 80, y: 10, r: 3.0, gold: false },
          { x: 125, y: 40, r: 2.5, gold: false },
          { x: 170, y: 20, r: 3.5, gold: true },
          { x: 200, y: -15, r: 2.7, gold: false },
          { x: 235, y: 5, r: 3.0, gold: true },
        ],
        lineas: [
          [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]
        ],
      },
      // Cisne
      {
        nombre: 'Cisne',
        color: 'rgba(147, 197, 253, 0.55)',
        lineColor: 'rgba(96, 165, 250, 0.28)',
        ox: 0.78,
        oy: 0.65,
        puntos: [
          { x: 0, y: 0, r: 3.8, gold: true },
          { x: -50, y: -30, r: 2.6, gold: false },
          { x: 50, y: 30, r: 2.6, gold: false },
          { x: -30, y: 45, r: 3.0, gold: true },
          { x: -65, y: 90, r: 2.5, gold: false },
        ],
        lineas: [
          [1, 0], [0, 2],
          [0, 3], [3, 4]
        ],
      },
    ]

    const numEstrellas = 85
    const estrellas = Array.from({ length: numEstrellas }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.12 - 0.1,
      vy: (Math.random() - 0.5) * 0.08 - 0.04,
      r: Math.random() * 2 + 0.6,
      baseAlpha: Math.random() * 0.6 + 0.3,
      twinkleSpeed: Math.random() * 0.03 + 0.015,
      phase: Math.random() * Math.PI * 2,
      gold: i % 4 === 0,
      blue: i % 3 === 0,
    }))

    let panOffsetX = 0
    let panOffsetY = 0

    // ─────────────────────────────────────────────────────────────────────────
    // LOOP DE RENDERIZADO
    // ─────────────────────────────────────────────────────────────────────────
    const render = () => {
      t += 0.02
      ctx.clearRect(0, 0, width, height)

      if (esGhibli) {
        // ── RENDER MODO GHIBLI: Hojas poligonales y pétalos ──
        particulasGhibli.forEach((p) => {
          // Movimiento orgánico con viento y zigzag
          p.y += p.vy
          p.x += p.vx + Math.sin(t * p.swaySpeed * 60 + p.phase) * p.swayAmp
          p.angle += p.rotSpeed

          // Reaparecer suavemente al salir por la parte inferior o laterales
          if (p.y > height + 30) {
            p.y = -30
            p.x = Math.random() * (width + 60) - 30
          }
          if (p.x > width + 40) p.x = -30
          if (p.x < -40) p.x = width + 30

          const scaleX = Math.cos(t * p.flipSpeed * 40 + p.phase)
          const scaleY = 1.0

          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.angle)
          ctx.scale(scaleX, scaleY)

          if (p.tipo === 'hoja') {
            // 🍃 DIBUJO DE HOJA VERDE POLIGONAL / ASIMÉTRICA CON NERVADURA
            const s = p.size
            ctx.beginPath()
            ctx.moveTo(0, -s)
            // Curva lateral derecha (asimétrica)
            ctx.bezierCurveTo(s * 0.75, -s * 0.45, s * 0.95, s * 0.4, 0, s * 1.1)
            // Curva lateral izquierda (más estilizada)
            ctx.bezierCurveTo(-s * 0.65, s * 0.45, -s * 0.7, -s * 0.5, 0, -s)
            ctx.closePath()

            ctx.fillStyle = p.color
            ctx.shadowColor = 'rgba(46, 125, 50, 0.25)'
            ctx.shadowBlur = 3
            ctx.fill()

            // Nervadura central de la hoja
            ctx.beginPath()
            ctx.moveTo(0, -s * 0.85)
            ctx.lineTo(0, s * 0.95)
            ctx.strokeStyle = p.veinColor
            ctx.lineWidth = 0.8
            ctx.stroke()
          } else {
            // 🌸 DIBUJO DE PÉTALO DE SAKURA (Pétalo redondeado con muesca superior)
            const s = p.size
            ctx.beginPath()
            ctx.moveTo(0, s)
            // Lóbulo derecho
            ctx.bezierCurveTo(s * 0.85, s * 0.3, s * 0.9, -s * 0.6, s * 0.25, -s)
            // Hendidura / muesca del pétalo de cerezo
            ctx.bezierCurveTo(0, -s * 0.75, 0, -s * 0.75, -s * 0.25, -s)
            // Lóbulo izquierdo
            ctx.bezierCurveTo(-s * 0.9, -s * 0.6, -s * 0.85, s * 0.3, 0, s)
            ctx.closePath()

            ctx.fillStyle = p.color
            ctx.shadowColor = 'rgba(244, 143, 177, 0.3)'
            ctx.shadowBlur = 4
            ctx.fill()
          }

          ctx.restore()
        })
      } else {
        // ── RENDER MODO COSMOS: Red Estelar y Constelaciones ──
        panOffsetX = (panOffsetX - 0.18 + width) % width
        panOffsetY = (panOffsetY - 0.06 + height) % height

        // 1. Estrellas del fondo
        estrellas.forEach((star) => {
          star.x += star.vx
          star.y += star.vy

          if (star.x < 0) star.x = width
          if (star.x > width) star.x = 0
          if (star.y < 0) star.y = height
          if (star.y > height) star.y = 0

          const alpha = Math.max(0.15, star.baseAlpha + Math.sin(t * star.twinkleSpeed * 60 + star.phase) * 0.35)

          ctx.beginPath()
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
          if (star.gold) {
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`
            ctx.shadowColor = 'rgba(255, 215, 0, 0.6)'
            ctx.shadowBlur = star.r * 3
          } else if (star.blue) {
            ctx.fillStyle = `rgba(96, 165, 250, ${alpha})`
            ctx.shadowColor = 'rgba(59, 130, 246, 0.6)'
            ctx.shadowBlur = star.r * 2.5
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
            ctx.shadowColor = 'rgba(255, 255, 255, 0.4)'
            ctx.shadowBlur = star.r * 1.5
          }
          ctx.fill()
        })

        // 2. Constelaciones Dinámicas
        for (const c of constelaciones) {
          const baseX = ((c.ox * width + panOffsetX) % width)
          const baseY = ((c.oy * height + panOffsetY) % height)

          ctx.strokeStyle = c.lineColor
          ctx.lineWidth = 1.2
          ctx.setLineDash([3, 3])
          ctx.shadowBlur = 0

          c.lineas.forEach(([i1, i2]) => {
            const p1 = c.puntos[i1]
            const p2 = c.puntos[i2]
            if (!p1 || !p2) return

            ctx.beginPath()
            ctx.moveTo(baseX + p1.x, baseY + p1.y)
            ctx.lineTo(baseX + p2.x, baseY + p2.y)
            ctx.stroke()
          })
          ctx.setLineDash([])

          c.puntos.forEach((p, idx) => {
            const px = baseX + p.x
            const py = baseY + p.y
            const pulse = Math.sin(t * 2 + idx) * 0.8

            ctx.beginPath()
            ctx.arc(px, py, p.r + pulse * 0.5, 0, Math.PI * 2)
            if (p.gold) {
              ctx.fillStyle = '#FFD700'
              ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
              ctx.shadowBlur = 8
            } else {
              ctx.fillStyle = '#93C5FD'
              ctx.shadowColor = 'rgba(59, 130, 246, 0.8)'
              ctx.shadowBlur = 6
            }
            ctx.fill()
          })
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [esGhibli])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
