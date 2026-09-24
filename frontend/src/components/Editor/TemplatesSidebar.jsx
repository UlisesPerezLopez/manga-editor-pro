// TemplatesSidebar.jsx
// Panel lateral de Plantillas de Maquetación de Páginas Manga (MEP).
// Consume pageTemplates.json y renderiza miniaturas visuales esquemáticas.
// Permite aplicar la cuadrícula al lienzo de Fabric.js con marcos estándar (borde 4px, fondo blanco).

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutTemplate, Check, AlertCircle, Grid, Sparkles } from 'lucide-react'
import pageTemplatesData from '../../data/pageTemplates.json'

export default function TemplatesSidebar({ canvasRef, onAplicarPlantilla, plantillaActivaId }) {
  const { t } = useTranslation()
  const [seleccionada, setSeleccionada] = useState(plantillaActivaId || 'grid_4_regular')

  // Obtener lista de plantillas disponibles
  const plantillas = Object.values(pageTemplatesData || {})

  const handleSeleccionarPlantilla = (plantilla) => {
    setSeleccionada(plantilla.id)

    // Si se pasa función callback personalizada
    if (onAplicarPlantilla) {
      onAplicarPlantilla(plantilla)
      return
    }

    // O aplicar directamente a través de canvasRef
    if (canvasRef?.current?.aplicarPlantillaDesdeJson) {
      canvasRef.current.aplicarPlantillaDesdeJson(plantilla)
    }
  }

  const getNombrePlantilla = (p) => {
    switch (p.id) {
      case 'grid_1_splash': return t('editor.templatesSidebar.splash') || p.nombre
      case 'grid_3_horizontal': return t('editor.templatesSidebar.twoHorizontal') || p.nombre
      case 'grid_4_regular': return t('editor.templatesSidebar.bruguera') || p.nombre
      case 'grid_5_action': return t('editor.templatesSidebar.actionFive') || p.nombre
      default: return p.nombre
    }
  }

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-rdc-text">
      {/* ── Cabecera del Panel ── */}
      <div className="p-3 border-b border-rdc-border space-y-1.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-rdc-accent" />
          <h3 className="font-titulo text-xs font-black uppercase tracking-wider text-rdc-text">
            {t('editor.templatesSidebar.title') || 'Plantillas de Maquetación'}
          </h3>
        </div>
        <p className="text-[11px] text-rdc-muted leading-tight">
          {t('editor.templatesSidebar.subtitle') || 'Selecciona una retícula para construir los marcos de viñetas en tu página.'}
        </p>
      </div>

      {/* ── Catálogo de Plantillas con Miniaturas Esquemáticas ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {plantillas.length === 0 ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-rdc-border text-rdc-muted text-xs">
            {t('editor.templatesSidebar.noTemplates') || 'No se encontraron plantillas de página.'}
          </div>
        ) : (
          plantillas.map((p) => {
            const esActiva = seleccionada === p.id
            const numVinetas = p.vinetas?.length || 0

            return (
              <div
                key={p.id}
                onClick={() => handleSeleccionarPlantilla(p)}
                className={`group relative rounded-xl border p-2.5 space-y-2 cursor-pointer transition-all duration-200 ${
                  esActiva
                    ? 'border-rdc-accent bg-rdc-accent/10 shadow-md ring-1 ring-rdc-accent/50'
                    : 'border-rdc-border bg-rdc-primary hover:border-rdc-accent/70 hover:bg-rdc-card'
                }`}
              >
                {/* Cabecera de la plantilla */}
                <div className="flex items-center justify-between">
                  <span className="font-titulo text-xs font-bold text-rdc-text group-hover:text-rdc-accent transition-colors truncate">
                    {getNombrePlantilla(p)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rdc-card border border-rdc-border text-rdc-muted">
                    {numVinetas} {t('editor.tabs.panels') || 'viñetas'}
                  </span>
                </div>

                {/* Miniatura Esquemática Proporcional (Relación A4 ~ 595:842) */}
                <div className="relative w-full aspect-[595/842] max-h-40 bg-white rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
                  {p.vinetas?.map((vin) => (
                    <div
                      key={vin.id}
                      className="absolute border-[2.5px] border-black bg-slate-50/80 hover:bg-amber-50/80 transition-colors flex items-center justify-center shadow-xs"
                      style={{
                        left: `${vin.x * 100}%`,
                        top: `${vin.y * 100}%`,
                        width: `${vin.w * 100}%`,
                        height: `${vin.h * 100}%`,
                      }}
                      title={`Marco ${vin.id}`}
                    >
                      <span className="text-[10px] font-mono font-black text-slate-700 uppercase">
                        {vin.id}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Botón de Aplicar */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSeleccionarPlantilla(p)
                    }}
                    className={`text-[11px] font-titulo font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      esActiva
                        ? 'bg-rdc-accent text-white shadow-xs'
                        : 'bg-rdc-card border border-rdc-border text-rdc-text hover:bg-rdc-accent hover:text-white'
                    }`}
                  >
                    {esActiva ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>{t('common.active') || 'Activa'}</span>
                      </>
                    ) : (
                      <>
                        <Grid className="w-3 h-3" />
                        <span>{t('editor.templatesSidebar.applyToCanvas') || 'Aplicar al Lienzo'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer Informativo ── */}
      <div className="p-2.5 border-t border-rdc-border bg-rdc-primary/50 text-[11px] text-rdc-muted font-titulo flex items-center justify-between flex-shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-rdc-accent" />
          {t('editor.tools.panel') || 'Marcos'} 4px
        </span>
        <span className="text-[10px] font-mono">595 × 842 px</span>
      </div>
    </div>
  )
}
