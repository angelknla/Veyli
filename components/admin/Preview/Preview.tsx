import fieldStyles from '@/components/admin/Fields/Fields.module.css';
import styles from '@/components/admin/Preview/Preview.module.css';
import LoadingImage from '@/components/LoadingImage/LoadingImage';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import type { AdminRecord, AdminSnapshot } from '@/features/admin/contracts';
import { frameCover, musicCrop } from '@/features/game/presentation';
import { cn } from '@/lib/utils';

const Preview = ({ record, snapshot }: { record: AdminRecord; snapshot: AdminSnapshot }) => {
  const answer = snapshot.items.find((item) => item.id === record.answer_id);
  const mode = snapshot.modes.find((value) => value.id === record.mode_id);
  const category = snapshot.categories.find((value) => value.id === record.category_id);
  const clues = (record.clues || []) as AdminRecord[];
  return (
    <section className={styles.adminPreview}>
      <p className={cn(sharedStyles.eyebrow, styles.eyebrow)}>
        INTERNAL PREVIEW — CONTAINS SPOILERS
      </p>
      <h2 className={fieldStyles.editorSectionTitle}>
        {String(answer?.title || 'Select an answer')} ({String(answer?.release_year || '')})
      </h2>
      <p className={fieldStyles.adminHelp}>
        {String(record.release_date)} · {String(record.attempt_limit)} attempts ·{' '}
        {String(record.status)}
      </p>
      {mode?.slug === 'one-frame' && (
        <p className={fieldStyles.adminHelp}>
          The same shot is covered by a smaller central rectangle after each miss. The complete shot
          appears with the result.
        </p>
      )}
      {clues.map((clue, index) => {
        const media = snapshot.media.find((value) => value.id === clue.media_id);
        return (
          <div className={styles.previewClue} key={index}>
            <span className={cn(sharedStyles.eyebrow, styles.eyebrow)}>
              CLUE {index + 1} · {String(clue.presentation)}
            </span>
            {clue.kind === 'image' && media ? (
              <LoadingImage
                width={1200}
                height={800}
                sizes="(max-width: 850px) 92vw, 65vw"
                loading={index === 0 ? 'eager' : 'lazy'}
                src={`/api/admin/media/${media.id}?blur=${Number(clue.blur_amount || 0)}&crop=${mode?.slug === 'classic' && category?.slug === 'music' ? musicCrop(0, Number(record.attempt_limit)) : Number(clue.crop_percent || 100)}&cover=${mode?.slug === 'one-frame' ? frameCover(0, Number(record.attempt_limit)) : 0}`}
                alt={`Internal preview clue ${index + 1}`}
              />
            ) : (
              <blockquote>{String(clue.text_content || media?.quote_text || '')}</blockquote>
            )}
          </div>
        );
      })}
    </section>
  );
};

export default Preview;
