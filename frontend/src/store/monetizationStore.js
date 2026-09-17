// monetizationStore.js
// Store reactivo para gestión de saldo virtual (Tinteros / Inks), desbloqueo de capítulos premium y enlaces a Patreon/Ko-fi.

import { create } from 'zustand'

const STORAGE_INKS_KEY = 'mep_user_inks'
const STORAGE_UNLOCKED_KEY = 'mep_unlocked_chapters'

export const useMonetizationStore = create((set, get) => ({
  saldoTinteros: parseInt(localStorage.getItem(STORAGE_INKS_KEY) || '120', 10),
  capitulosDesbloqueados: JSON.parse(localStorage.getItem(STORAGE_UNLOCKED_KEY) || '[]'),
  costoPorCapitulo: 20,
  creatorPassActivo: false,

  patreonUrl: 'https://patreon.com',
  kofiUrl: 'https://ko-fi.com',

  /**
   * Comprueba si un capítulo está accesible para lectura
   */
  estaDesbloqueado: (capitulo) => {
    if (!capitulo) return true
    // Si no está marcado como premium, es de libre acceso
    if (!capitulo.is_premium) return true

    const state = get()
    if (state.creatorPassActivo) return true
    return state.capitulosDesbloqueados.includes(capitulo.id)
  },

  /**
   * Desbloquea un capítulo consumiendo Tinteros
   */
  desbloquearCapitulo: (capituloId) => {
    const { saldoTinteros, costoPorCapitulo, capitulosDesbloqueados } = get()

    if (capitulosDesbloqueados.includes(capituloId)) {
      return { exito: true, mensaje: 'Ya desbloqueado' }
    }

    if (saldoTinteros < costoPorCapitulo) {
      return {
        exito: false,
        mensaje: 'Tinteros insuficientes. Recarga tu saldo o apoya en Patreon.'
      }
    }

    const nuevoSaldo = saldoTinteros - costoPorCapitulo
    const nuevaLista = [...capitulosDesbloqueados, capituloId]

    localStorage.setItem(STORAGE_INKS_KEY, nuevoSaldo.toString())
    localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(nuevaLista))

    set({
      saldoTinteros: nuevoSaldo,
      capitulosDesbloqueados: nuevaLista
    })

    return { exito: true, saldoRestante: nuevoSaldo }
  },

  /**
   * Añade Tinteros al saldo virtual
   */
  recargarTinteros: (cantidad) => {
    const nuevoSaldo = get().saldoTinteros + cantidad
    localStorage.setItem(STORAGE_INKS_KEY, nuevoSaldo.toString())
    set({ saldoTinteros: nuevoSaldo })
  },

  /**
   * Activa el pase de creador completo
   */
  toggleCreatorPass: () => {
    set((state) => ({ creatorPassActivo: !state.creatorPassActivo }))
  }
}))

export default useMonetizationStore
