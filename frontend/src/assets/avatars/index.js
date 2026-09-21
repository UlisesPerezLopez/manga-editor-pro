// frontend/src/assets/avatars/index.js
// Registro centralizado de Avatares Arquetípicos y Badges de Rol Manga para MEP.

import rolProtagonista from './roles/rol_protagonista.png'
import rolAntagonista from './roles/rol_antagonista.png'
import rolApoyoAliado from './roles/rol_apoyo_aliado.png'
import rolSecundarioExtra from './roles/rol_secundario_extra.png'

import espadachinShonen from './espadachin_shonen.png'
import espadachinShonen2 from './espadachin_shonen2.png'
import villanoCerebral from './villano_cerebral _cientifico.png'
import villanoCerebral2 from './villano_cerebral _cientifico2.png'
import hechiceraMistica from './hechicera_mistica.png'
import hechiceraMistica2 from './hechicera_mistica2.png'
import senseiVeterano from './sensei _maestro_veterano.png'
import senseiVeterano2 from './sensei _maestro_veterano2.png'
import pilotoMecha from './piloto_mecha_ingeniera.png'
import pilotoMecha2 from './piloto_mecha_ingeniera2.png'
import detectiveCyberpunk from './detective _cyberpunk.png'
import detectiveCyberpunk2 from './detective_cyberpunk2.png'
import detectiveCyberpunk3 from './detective_cyberpunk3.png'

export const MANGA_ROLES = {
  protagonista: rolProtagonista,
  coprotagonista: rolProtagonista,
  antagonista: rolAntagonista,
  rival: rolAntagonista,
  apoyo: rolApoyoAliado,
  mentor: rolApoyoAliado,
  secundario: rolSecundarioExtra,
  // Aliases de compatibilidad
  principal: rolProtagonista,
  villano: rolAntagonista,
  aliado: rolApoyoAliado,
  extra: rolSecundarioExtra,
}

export const MANGA_AVATARS = {
  espadachin_shonen: espadachinShonen,
  espadachin_shonen2: espadachinShonen2,
  villano_cerebral_cientifico: villanoCerebral,
  villano_cerebral_cientifico2: villanoCerebral2,
  hechicera_mistica: hechiceraMistica,
  hechicera_mistica2: hechiceraMistica2,
  sensei_maestro_veterano: senseiVeterano,
  sensei_maestro_veterano2: senseiVeterano2,
  piloto_mecha_ingeniera: pilotoMecha,
  piloto_mecha_ingeniera2: pilotoMecha2,
  detective_cyberpunk: detectiveCyberpunk,
  detective_cyberpunk2: detectiveCyberpunk2,
  detective_cyberpunk3: detectiveCyberpunk3,
}

/**
 * Devuelve la insignia gráfica de rol manga según el identificador de rol.
 * @param {string} role - 'protagonista' | 'coprotagonista' | 'antagonista' | 'apoyo' | 'secundario' | 'mentor' | 'rival'
 * @returns {string} URL de la imagen del badge de rol
 */
export function getRoleBadge(role) {
  if (!role) return MANGA_ROLES.secundario
  const normalizado = String(role).toLowerCase().trim()
  return MANGA_ROLES[normalizado] || MANGA_ROLES.secundario
}

/**
 * Devuelve el avatar arquetípico por defecto según el rol del personaje.
 * @param {string} role - 'protagonista' | 'coprotagonista' | 'antagonista' | 'apoyo' | 'secundario' | 'mentor' | 'rival'
 * @returns {string} URL de la imagen del avatar arquetípico por defecto
 */
export function getDefaultAvatar(role) {
  if (!role) return detectiveCyberpunk2
  const normalizado = String(role).toLowerCase().trim()
  switch (normalizado) {
    case 'protagonista':
    case 'principal':
      return espadachinShonen
    case 'coprotagonista':
      return espadachinShonen2
    case 'antagonista':
    case 'villano':
      return villanoCerebral
    case 'rival':
      return villanoCerebral2
    case 'mentor':
      return senseiVeterano
    case 'apoyo':
    case 'aliado':
      return hechiceraMistica
    case 'secundario':
    case 'extra':
    default:
      return detectiveCyberpunk2
  }
}


export default {
  MANGA_ROLES,
  MANGA_AVATARS,
  getRoleBadge,
  getDefaultAvatar,
}
