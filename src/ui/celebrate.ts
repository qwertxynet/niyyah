import { lowStimulation } from './useTheme';

/**
 * A small burst of gold eight-point stars from an element — for a prayer
 * logged, a deed done, a reading saved. Optional `label` floats up from the
 * same spot ("+1,890"). Purely decorative: nothing waits on it, and it never
 * runs in low-stimulation mode or when the system asks for reduced motion.
 */
export function celebrate(from: Element | null | undefined, options: { count?: number; label?: string } = {}) {
  if (!from || typeof document === 'undefined' || lowStimulation()) return;
  const rect = from.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'burst';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;

  const count = options.count ?? 12;
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement('i');
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = 38 + Math.random() * 46;
    bit.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    bit.style.setProperty('--dy', `${Math.sin(angle) * distance - 14}px`);
    bit.style.setProperty('--size', `${9 + Math.random() * 9}px`);
    bit.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 220)}deg`);
    bit.style.animationDelay = `${Math.round(Math.random() * 70)}ms`;
    if (i % 3 === 0) bit.className = 'is-cream';
    layer.appendChild(bit);
  }

  if (options.label) {
    const label = document.createElement('span');
    label.className = 'burst-label tnum';
    label.textContent = options.label;
    layer.appendChild(label);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1300);
}
