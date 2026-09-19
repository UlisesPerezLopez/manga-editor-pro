// frontend/src/assets/stickers/index.js
// Registro centralizado de Stickers y Onomatopeyas Manga para Canvas Studio MEP.

import baamImg from './onomatopeyas/baam.png'
import boomImg from './onomatopeyas/boom.png'
import kaboomImg from './onomatopeyas/kaboom.png'
import dashImg from './onomatopeyas/dash.png'
import dokidokiImg from './onomatopeyas/dokidoki.png'
import pumPumImg from './onomatopeyas/pum_pum.png'
import donImg from './onomatopeyas/don.png'
import gogogoImg from './onomatopeyas/gogogo.png'
import gotaImg from './onomatopeyas/gota.png'
import poofImg from './onomatopeyas/poof.png'
import slashImg from './onomatopeyas/slash.png'

export const ONOMATOPEYAS_MAP = {
  baam: baamImg,
  boom: boomImg,
  kaboom: kaboomImg,
  dash: dashImg,
  dokidoki: dokidokiImg,
  pum_pum: pumPumImg,
  don: donImg,
  gogogo: gogogoImg,
  gota: gotaImg,
  poof: poofImg,
  slash: slashImg,
}

export const MANGA_ONOMATOPEYAS = [
  { id: 'don', name: 'DON (ドン - Impacto dramático)', category: 'impacto', src: donImg },
  { id: 'gogogo', name: 'GO GO GO (ゴゴゴ - Presagio/Tensión)', category: 'tension', src: gogogoImg },
  { id: 'baam', name: 'BAAM (Explosión/Golpe)', category: 'impacto', src: baamImg },
  { id: 'boom', name: 'BOOM (Detonación masiva)', category: 'impacto', src: boomImg },
  { id: 'kaboom', name: 'KABOOM (Estallido extremo)', category: 'impacto', src: kaboomImg },
  { id: 'slash', name: 'SLASH (Zan - Corte de espada/filo)', category: 'combate', src: slashImg },
  { id: 'dash', name: 'DASH (DODODO - Desplazamiento veloz)', category: 'movimiento', src: dashImg },
  { id: 'dokidoki', name: 'DOKI DOKI (Latido/Nerviosismo)', category: 'emocion', src: dokidokiImg },
  { id: 'pum_pum', name: 'PUM PUM (Golpes sucesivos)', category: 'combate', src: pumPumImg },
  { id: 'gota', name: 'GOTA (Gota de sudor/Vergüenza cómica)', category: 'humor', src: gotaImg },
  { id: 'poof', name: 'POOF (Aparición/Humo)', category: 'efecto', src: poofImg },
]

/**
 * Obtiene la imagen de onomatopeya por su identificador.
 * @param {string} id - 'don', 'gogogo', 'baam', etc.
 * @returns {string|null} URL del asset PNG
 */
export function getOnomatopeya(id) {
  return ONOMATOPEYAS_MAP[id] || null
}

export default {
  MANGA_ONOMATOPEYAS,
  ONOMATOPEYAS_MAP,
  getOnomatopeya,
}
