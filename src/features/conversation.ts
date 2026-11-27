import { assessOpportunity, normalize, opportunityStatus } from './eligibility'
import { emptyProfile } from '../types/domain'
import type { Category, Opportunity, Profile } from '../types/domain'

export const topics = {
  'inteligencia artificial': /\b(?:ia|ai|inteligencia artificial|artificial intelligence|machine learning|aprendizaje automatico|deep learning)\b/,
  'robótica': /robot/,
  'ciencia de datos': /ciencia de datos|data science|big data|data analysis|analisis de datos/,
  'computación': /comput|programaci|software|informatica|python|algoritm/,
  'medicina': /medicin|salud|health|biomedic/,
  'física': /fisica|physics/,
  'ingeniería': /ingenier|engineering/,
  'medio ambiente': /ambiente|clima|environment|sostenib/,
  'liderazgo': /liderazgo|leadership/,
} as const

const categoryTerms: Record<Category, RegExp> = {
  Becas: /\bbecas?\b|scholarships?/,
  Intercambios: /intercambio|movilidad|exchange/,
  Investigación: /investig|research/,
  Hackathons: /hackathon/,
  Conferencias: /conferencia|congreso|conference/,
  Certificaciones: /certificacion profesional|curso|certificaciones/,
  Liderazgo: /liderazgo|leadership/,
  Voluntariados: /voluntari|volunteer/,
  'Oportunidades profesionales': /pasantia|practicas profesionales|internship|empleo/,
}

const cycleNames = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'septimo', 'octavo', 'noveno', 'decimo']
const stop = new Set('quiero quisiera oportunidades oportunidad programa programas busco algun alguna para por con los las una unos del que cual cuales puedo podrias puede tengo me mis estoy todavia este esta sobre interesa interes gustaria conocer hacer participar encontrar acceder estudiar extranjero internacional internacionales ver dime hay informacion requisitos preparar prepararme postular necesito hola gracias meses beca becas financiamiento financiada financiado completo completa total ingles certificado certificacion ciclo ciclos tercer primer segundo semestre mejor adapta encaja conviene entre estas estas esos dos ambas comparar comparamos recomendarias falta faltan faltaria pide que cumplen sin ahi ellas ellos estas segunda primera universidad aprender universidad pais ayuda cuales seria existe existen tener tengo puedo recomendaste esas estos una acorde tambien preparacion nivel cuarto quinto sexto alguno algunas'.split(' '))

export const intents = ['explorar', 'requisitos', 'comparar', 'preparar', 'aclarar'] as const
export type Intent = typeof intents[number]
export const tips = ['documentos', 'idiomas', 'experiencia', 'fuente'] as const
export type Tip = typeof tips[number]
export const tipText: Record<Tip, string> = {
  documentos: 'Haz una lista de los documentos que pide la fuente oficial y reserva tiempo para reunirlos.',
  idiomas: 'Reserva un bloque semanal para practicar inglés y verifica si la institución acepta algún certificado.',
  experiencia: 'Elige un proyecto pequeño de tu área y documenta lo que aprendiste para tu portafolio.',
  fuente: 'Revisa el calendario y los requisitos directamente en la fuente oficial antes de iniciar tu postulación.',
}
export const guidanceOrigins = ['gemini', 'reglas'] as const
export const fallbackReasons = ['pilot', 'quota', 'unavailable', 'invalid'] as const
export type Fallback = typeof fallbackReasons[number]
export type ConversationInput = { message: string; previousIds: string[]; useProfile: boolean; reportedCycle?: number; reportedNoCertificate?: boolean }
export type Reply = {
  intent: Intent
  items: { opportunity: Opportunity; affinity: 'Alta afinidad' | 'Afinidad moderada'; reason: string; assessment: ReturnType<typeof assessOpportunity> }[]
  text: string
  tip: Tip
  origin: typeof guidanceOrigins[number]
  fallback?: Fallback
  horizon?: 3 | 6 | 12
}

export function topicKeys(value: string) {
  const text = normalize(value)
  return (Object.keys(topics) as (keyof typeof topics)[]).filter((key) => topics[key].test(text))
}

function terms(value: string) {
  return [...new Set(normalize(value).match(/[a-z][a-z0-9]{2,}/g) ?? [])].filter((word) => !stop.has(word))
}

function hasPhrase(text: string, phrase: string) {
  return (' ' + text.replace(/[^a-z0-9]+/g, ' ') + ' ').includes(' ' + normalize(phrase).replace(/[^a-z0-9]+/g, ' ').trim() + ' ')
}

export function reportedFacts(message: string) {
  const text = normalize(message)
  const before = text.match(/\b(?:en|curso|estoy en)\s+(\d{1,2}|primer|segundo|tercer|cuarto|quinto|sexto|septimo|octavo|noveno|decimo)(?:er|ro|do|to|o|º|°)?\s+ciclo\b/)
  const after = text.match(/\bciclo\s+(\d{1,2})\b/)
  const raw = before?.[1] ?? after?.[1]
  const cycle = raw === undefined ? 0 : Number(raw) || cycleNames.indexOf(raw) + 1
  return {
    ...(cycle >= 1 && cycle <= 16 ? { reportedCycle: cycle } : {}),
    ...(/(?:sin|no tengo|todavia no tengo)\s+(?:un\s+)?certificado(?: de ingles)?\b/.test(text) ? { reportedNoCertificate: true } : {}),
  }
}

export function conversation(input: ConversationInput, catalog: Opportunity[], savedProfile: Profile = emptyProfile) {
  const message = normalize(input.message)
  const facts = { ...input, ...reportedFacts(input.message) }
  const base = input.useProfile ? savedProfile : emptyProfile
  const profile: Profile = {
    ...base,
    cycle: facts.reportedCycle ?? base.cycle,
    certificate: facts.reportedNoCertificate ? 'No' : base.certificate,
  }
  const fullFunding = /\b(?:financiamiento|financiacion|financiadas|financiados)\s+(?:completo|completa|total)|\b(?:todo pagado|full funding)\b/.test(message)
  const requiredFunding = fullFunding ? 'Completo' : /financiamiento parcial|financiacion parcial/.test(message) ? 'Parcial'
    : /sin financiamiento|sin financiacion/.test(message) ? 'Sin financiamiento' : null
  const abroad = /extranjero|internacional|fuera (?:de|del) peru/.test(message)
  const virtual = /\b(?:solo|unicamente)\s+(?:virtual|en linea|remoto)/.test(message)
  const noCertificate = /(?:sin|no tengo|todavia no tengo)\s+(?:un\s+)?certificado/.test(message)
  const categories = (Object.keys(categoryTerms) as Category[]).filter((key) => categoryTerms[key].test(message))
  const themes = topicKeys(message)
  const profileThemes = topicKeys([profile.program, ...profile.interests, ...profile.skills].join(' '))
  const intent: Intent = /compara|mejor|adapta|conviene|encaja|cual de/.test(message) ? 'comparar'
    : /\brequisitos?\b|me falta|elegible|cumplo|piden|puedo postular/.test(message) ? 'requisitos'
      : /prepar|plan|\bruta\b|\bmeses\b/.test(message) ? 'preparar' : 'explorar'
  const followUp = input.previousIds.length > 0 && (intent === 'comparar'
    || /\b(?:las dos|los dos|ambas|ambos|ellas|ellos|primera|segunda|esta oportunidad|estas oportunidades|la anterior|de esas)\b|^y\s/.test(message)
    || ((intent === 'requisitos' || intent === 'preparar') && !categories.length && !themes.length && !abroad))
  const approved = catalog.filter((item) => item.status === 'Aprobada')
  const named = approved.filter((item) => {
    const aliases = [item.title, item.organization, ...((normalize(item.title + ' ' + item.organization).match(/\b(?:eth|cern|kaust)\b/)) ?? [])]
    return aliases.some((alias) => alias.length >= 3 && hasPhrase(message, alias))
  })
  const countries = new Set(approved.map((item) => item.country).filter((country) => country && hasPhrase(message, country)))
  const monthText = message.match(/\b(3|6|12|tres|seis|doce)\s+meses\b/)?.[1]
  const horizon = monthText === '3' || monthText === 'tres' ? 3 : monthText === '6' || monthText === 'seis' ? 6 : monthText === '12' || monthText === 'doce' ? 12 : undefined
  const ordinal = /\bsegunda\b/.test(message) ? 1 : /\bprimera\b/.test(message) ? 0 : null
  const previous = ordinal === null ? input.previousIds : input.previousIds.slice(ordinal, ordinal + 1)
  const target = named.length ? named : followUp ? approved.filter((item) => previous.includes(item.id)) : approved
  const countryTerms = [...countries].flatMap(terms)
  const words = terms(message).filter((word) => ![...countryTerms, 'tres', 'seis', 'doce', 'proximos', 'proximas', 'financiacion', 'parcial', 'full', 'funding'].includes(word))
  const publicSignals = { intent, categories, themes, funding: requiredFunding, abroad, virtual, horizon }
  const matching = target
    .filter((item) => named.length || !['Vencida', 'Cerrada'].includes(opportunityStatus(item)))
    .filter((item) => (!requiredFunding || item.funding === requiredFunding) && (!abroad || (item.country && normalize(item.country) !== 'peru'))
      && (!virtual || item.modality === 'Virtual') && (!countries.size || countries.has(item.country)))
    .map((opportunity) => {
      const text = [opportunity.title, ...opportunity.topics, opportunity.description].join(' ')
      const catalogThemes = topicKeys(text)
      const thematicMatches = themes.filter((theme) => catalogThemes.includes(theme))
      const exact = words.filter((word) => hasPhrase(text, word) || hasPhrase(text, word + 's'))
      const category = categories.includes(opportunity.category)
      const fundingOnly = requiredFunding && !categories.length && !themes.length && !words.length
      const general = !categories.length && !themes.length && !words.length
      const matches = named.includes(opportunity) || followUp || (themes.length > 0 ? thematicMatches.length > 0 : exact.length > 0 || category)
        || fundingOnly || (general && (abroad || virtual || countries.size > 0 || noCertificate))
      const assessment = assessOpportunity(opportunity, profile)
      const points = (named.includes(opportunity) ? 12 : 0) + thematicMatches.length * 4 + Math.min(3, exact.length) + (category ? 2 : 0)
      const profilePoints = profileThemes.filter((theme) => catalogThemes.includes(theme)).length
      const reason = thematicMatches.length ? 'Coincide con tu interés en ' + thematicMatches.join(', ') + '.'
        : named.length ? 'Es la convocatoria que mencionaste.' : followUp ? 'Forma parte de las opciones que estábamos revisando.'
          : fundingOnly ? 'Coincide con el financiamiento que pediste.' : category ? 'Corresponde a la categoría que buscas.'
            : exact.length ? 'Su convocatoria menciona temas relacionados con tu búsqueda.'
              : noCertificate ? 'Puedes revisar si la fuente oficial exige una certificación.' : 'Coincide con el destino o la modalidad de tu búsqueda.'
      return { opportunity, assessment, points, profilePoints, catalogThemes, matches, reason }
    })
    .filter((item) => item.matches)
  const publicCandidates = [...matching].sort((a, b) => b.points - a.points || a.opportunity.id.localeCompare(b.opportunity.id)).slice(0, 6)
  const ranked = matching.filter((item) => !noCertificate || intent === 'requisitos' || !item.opportunity.requirements.some((r) => r.kind === 'certificate' && r.mandatory))
    .sort((a, b) => intent === 'comparar'
      ? a.assessment.gaps - b.assessment.gaps || a.assessment.unknown - b.assessment.unknown || b.points - a.points || b.profilePoints - a.profilePoints
      : b.points - a.points || b.profilePoints - a.profilePoints)
    .slice(0, 6)

  let text: string
  if (!ranked.length) {
    text = followUp ? 'Las opciones anteriores ya no coinciden con esta búsqueda o no están disponibles en el catálogo.'
      : intent === 'preparar' && horizon ? 'Para un horizonte de ' + horizon + ' meses, empieza por un objetivo concreto. Dedica la primera etapa a identificar requisitos, la segunda a desarrollar una habilidad y la última a reunir evidencias.'
        : 'El catálogo todavía es limitado y no encontré convocatorias compatibles. Puedes probar otra categoría, tema o modalidad.'
  } else if (intent === 'comparar' && ranked.length > 1) {
    const [first, second] = ranked
    const differentiated = first.assessment.gaps !== second.assessment.gaps || first.assessment.unknown !== second.assessment.unknown
    text = differentiated && (input.useProfile || facts.reportedCycle || facts.reportedNoCertificate)
      ? first.opportunity.title + ' queda primero al comparar las brechas y los requisitos por confirmar que figuran debajo.'
      : 'Estas son las opciones para comparar. Revisa juntas la afinidad y las condiciones registradas para decidir cuál priorizar.'
  } else if (intent === 'requisitos') {
    text = 'Estos son los requisitos registrados. Puedes ampliar cada tarjeta para revisar tus brechas y los datos que faltan por confirmar.'
  } else if (intent === 'preparar') {
    text = 'Puedes empezar por las brechas de estas convocatorias. Si una edición ya cerró, su ficha sirve de referencia para prepararte. Una próxima edición depende de la institución.'
    if (horizon) text += ' En «Generar mi ruta» puedes elegir un horizonte estimado de ' + horizon + ' meses.'
  } else {
    text = 'Encontré estas opciones en el catálogo. Revisa la afinidad por tema y las condiciones de cada convocatoria.'
  }
  if (ranked.length && !input.useProfile && !facts.reportedCycle && !facts.reportedNoCertificate) {
    text += ' Si eliges usar tu perfil, puedo evaluar los requisitos con los datos que ya guardaste.'
  }
  const tip: Tip = noCertificate ? 'idiomas' : intent === 'requisitos' ? 'documentos' : ranked.length ? 'fuente' : 'experiencia'
  function reply(order = ranked, origin: Reply['origin'] = 'reglas', suggestedTip = tip): Reply {
    return {
      intent, text, tip: suggestedTip, origin, horizon,
      items: order.map(({ opportunity, assessment, points, reason }) => ({
        opportunity, assessment, reason, affinity: points >= 4 ? 'Alta afinidad' : 'Afinidad moderada',
      })),
    }
  }
  return { reply, ranked, publicSignals, publicCandidates }
}
