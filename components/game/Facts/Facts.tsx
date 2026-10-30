'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import styles from '@/components/game/Facts/Facts.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import type { GameState } from '@/features/game/contracts';
import { cn } from '@/lib/utils';

const Facts = ({ state }: { state: GameState }) => {
  const list = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const facts = state.clues.slice(1).filter((clue) => clue.kind === 'text');
  useEffect(() => {
    if (state.attemptsUsed > 0) list.current?.scrollTo({ top: 0 });
  }, [state.attemptsUsed]);
  return (
    <section className={styles.factBoard} aria-label="Facts">
      <div className={styles.factBoardHeading}>
        <span className={sharedStyles.eyebrow}>THE FACTS</span>
        <span>
          {facts.length} / {state.challenge.attemptLimit - 1}
        </span>
      </div>
      {facts.length ? (
        <div
          className={styles.factGrid}
          data-testid="fact-grid"
          ref={list}
          role="log"
          aria-label="Revealed facts"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable fact log needs keyboard access.
          tabIndex={0}
        >
          {[...facts].reverse().map((fact) => {
            const separator = fact.text?.indexOf(':') ?? -1;
            return (
              <motion.div
                key={fact.position}
                className={cn(styles.factCard, styles.factUnlocked)}
                data-testid="fact-card fact-unlocked"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className={styles.factLabel}>
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
        <p className={sharedStyles.muted}>A new fact after each miss.</p>
      )}
    </section>
  );
};

export default Facts;
