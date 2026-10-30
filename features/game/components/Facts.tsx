'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { GameState } from '../contracts';

export default function Facts({ state }: { state: GameState }) {
  const list = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const facts = state.clues.slice(1).filter((clue) => clue.kind === 'text');
  useEffect(() => {
    if (state.attemptsUsed > 0) list.current?.scrollTo({ top: 0 });
  }, [state.attemptsUsed]);
  return (
    <section className="fact-board" aria-label="Facts">
      <div className="fact-board-heading">
        <span className="eyebrow">THE FACTS</span>
        <span>
          {facts.length} / {state.challenge.attemptLimit - 1}
        </span>
      </div>
      {facts.length ? (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable fact log needs keyboard access.
        <div className="fact-grid" ref={list} role="log" aria-label="Revealed facts" tabIndex={0}>
          {[...facts].reverse().map((fact) => {
            const separator = fact.text?.indexOf(':') ?? -1;
            return (
              <motion.div
                key={fact.position}
                className="fact-card fact-unlocked"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="fact-label">
                  {separator > -1 ? fact.text!.slice(0, separator) : `Fact ${fact.position - 1}`}
                </span>
                <strong>
                  {separator > -1 ? fact.text!.slice(separator + 1).trim() : fact.text}
                </strong>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <p className="muted">A new fact after each miss.</p>
      )}
    </section>
  );
}
