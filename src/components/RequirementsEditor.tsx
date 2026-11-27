import { Plus, X } from 'lucide-react'
import { academicLevels, englishLevels } from '../types/domain'
import type { Opportunity, Requirement } from '../types/domain'
import { Button } from './ui'

const kinds: Record<Requirement['kind'], string> = {
  manual: 'Comprobación manual',
  cycle: 'Ciclo mínimo',
  english: 'Nivel de inglés',
  certificate: 'Certificación de inglés',
  travel: 'Disponibilidad para viajar',
  skill: 'Habilidad',
  level: 'Nivel académico',
}

function changeKind(requirement: Requirement, kind: Requirement['kind']): Requirement {
  const { id, label, mandatory, unit, source } = requirement
  const base = { id, label, mandatory, unit, source }
  switch (kind) {
    case 'cycle': return { ...base, kind, minimum: 1 }
    case 'english': return { ...base, kind, minimum: 'B2' }
    case 'skill': return { ...base, kind, skill: '' }
    case 'level': return { ...base, kind, levels: ['Pregrado'] }
    default: return { ...base, kind }
  }
}

export function RequirementsEditor({ requirements, onChange }: { requirements: Requirement[]; onChange: (value: Requirement[]) => void }) {
  function replace(requirement: Requirement) {
    onChange(requirements.map((item) => item.id === requirement.id ? requirement : item))
  }
  return <fieldset className="requirements-editor">
    <legend>Requisitos de la convocatoria</legend>
    {requirements.map((requirement, index) => <fieldset className="surface requirement-fields" key={requirement.id}>
      <legend>Requisito {index + 1}</legend>
      <div className="form-grid">
        <label className="field"><span>Descripción oficial</span><input required value={requirement.label} maxLength={300} onChange={(event) => replace({ ...requirement, label: event.target.value })} /></label>
        <label className="field"><span>Tipo</span><select aria-label="Tipo de requisito" value={requirement.kind} onChange={(event) => replace(changeKind(requirement, event.target.value as Requirement['kind']))}>
          {Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        {requirement.kind === 'cycle' && <>
          <label className="field"><span>Ciclo requerido</span><input type="number" min={1} max={16} required value={requirement.minimum || ''} onChange={(event) => replace({ ...requirement, minimum: Number(event.target.value) })} /></label>
          <label className="field"><span>Aplica al nivel</span><select aria-label="Nivel al que aplica el ciclo" value={requirement.whenLevel ?? ''} onChange={(event) => replace({ ...requirement, whenLevel: (event.target.value || undefined) as Opportunity['levels'][number] | undefined })}>
            <option value="">Cualquier nivel</option>{academicLevels.map((level) => <option key={level}>{level}</option>)}
          </select></label>
        </>}
        {requirement.kind === 'english' && <label className="field"><span>Nivel de inglés mínimo</span><select aria-label="Nivel de inglés mínimo" value={requirement.minimum} onChange={(event) => replace({ ...requirement, minimum: event.target.value as typeof englishLevels[number] })}>
          {englishLevels.map((level) => <option key={level}>{level}</option>)}
        </select></label>}
        {requirement.kind === 'skill' && <label className="field"><span>Habilidad requerida</span><input required maxLength={80} value={requirement.skill} onChange={(event) => replace({ ...requirement, skill: event.target.value })} /></label>}
        {requirement.kind === 'level' && <fieldset className="field"><legend>Niveles admitidos</legend><div className="action-row">
          {academicLevels.map((level) => <label className="check-field" key={level}><input type="checkbox" checked={requirement.levels.includes(level)} onChange={(event) =>
            replace({ ...requirement, levels: event.target.checked ? [...requirement.levels, level] : requirement.levels.filter((item) => item !== level) })
          } />{level}</label>)}
        </div></fieldset>}
        <label className="field"><span>Fuente del requisito <small>Opcional</small></span><input type="url" maxLength={2048} value={requirement.source ?? ''} onChange={(event) => replace({ ...requirement, source: event.target.value })} /></label>
        <label className="field"><span>Unidad o escala <small>Opcional</small></span><input maxLength={60} value={requirement.unit ?? ''} onChange={(event) => replace({ ...requirement, unit: event.target.value })} /></label>
      </div>
      <div className="action-row">
        <label className="check-field"><input type="checkbox" checked={requirement.mandatory} onChange={(event) => replace({ ...requirement, mandatory: event.target.checked })} />Obligatorio</label>
        <Button variant="text" aria-label={`Quitar requisito ${index + 1}`} onClick={() => onChange(requirements.filter((item) => item.id !== requirement.id))}><X size={15} /> Quitar</Button>
      </div>
    </fieldset>)}
    <Button variant="outline" disabled={requirements.length >= 30} onClick={() => onChange([...requirements, { id: crypto.randomUUID(), kind: 'manual', label: '', mandatory: true }])}>
      <Plus size={16} /> Añadir requisito
    </Button>
  </fieldset>
}
