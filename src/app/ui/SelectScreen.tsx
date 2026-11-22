import { bridge } from '../bridge';
import { useUI, type OperatorId } from '../store';

const OPERATORS: { id: OperatorId; code: string; name: string; tagline: string; credit: string }[] = [
  { id: 'female', code: 'OPERATOR 01', name: 'NEON FIGHTER +', tagline: 'Stylized cyber operator', credit: 'VRoid model by Kanato · CYBERVERSE edition' },
  { id: 'male', code: 'OPERATOR 02', name: 'CYBER JT', tagline: 'Techwear field operator', credit: 'VRoid model by Jonh Tinoco · CYBERVERSE edition' },
];

export function SelectScreen({ leaving = false }: { leaving?: boolean }) {
  const hovered = useUI((s) => s.hovered);
  return (
    <div className={`cv-select${leaving ? ' is-leaving' : ''}`} aria-hidden={leaving || undefined}>
      <header className="cv-select-head">
        <p className="cv-kicker">SECURE UPLINK ESTABLISHED</p>
        <h1 className="cv-title">Choose your operator</h1>
      </header>
      <div className="cv-select-bottom">
      <div className="cv-select-cards" role="radiogroup" aria-label="Operator">
        {OPERATORS.map((op) => (
          <button
            key={op.id}
            type="button"
            role="radio"
            aria-checked={hovered === op.id}
            className={`cv-card ${hovered === op.id ? 'is-active' : ''}`}
            // Click selects (camera focuses the operator); double-click, Enter or the button confirms.
            onFocus={() => bridge.game?.hover(op.id)}
            onClick={() => bridge.game?.hover(op.id)}
            onDoubleClick={() => bridge.game?.confirm(op.id)}
          >
            <span className="cv-card-code cv-mono">{op.code}</span>
            <span className="cv-card-name">{op.name}</span>
            <span className="cv-card-tag">{op.tagline}</span>
            <span className="cv-card-credit">{op.credit}</span>
          </button>
        ))}
      </div>
      <div className="cv-select-actions">
        <button type="button" className="cv-primary" onClick={() => bridge.game?.confirm(hovered)}>
          Enter the Nexus
        </button>
        <p className="cv-hint cv-mono">
          click or <kbd>←</kbd> <kbd>→</kbd> to choose · <kbd>Enter</kbd> or double-click to confirm
        </p>
      </div>
      </div>
    </div>
  );
}
