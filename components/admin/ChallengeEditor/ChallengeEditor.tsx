import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import styles from '@/components/admin/ChallengeEditor/ChallengeEditor.module.css';
import { Field, ListField, options } from '@/components/admin/Fields/Fields';
import fieldStyles from '@/components/admin/Fields/Fields.module.css';
import { Button } from '@/components/ui/Button/Button';
import buttonStyles from '@/components/ui/Button/Button.module.css';
import type { AdminRecord, AdminSnapshot } from '@/features/admin/contracts';
import { cn } from '@/lib/utils';

const ChallengeEditor = ({
  record,
  snapshot,
  onChange,
}: {
  record: AdminRecord;
  snapshot: AdminSnapshot;
  onChange: (name: string, value: unknown) => void;
}) => {
  const clues = (record.clues || []) as AdminRecord[];
  const mode = snapshot.modes.find((value) => value.id === record.mode_id);
  const availableItems = snapshot.items.filter((item) => item.category_id === record.category_id);
  const changeClue = (index: number, name: string, value: unknown) => {
    onChange(
      'clues',
      clues.map((clue, i) => (i === index ? { ...clue, [name]: value } : clue))
    );
  };
  const reorder = (index: number, direction: number) => {
    const next = [...clues];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    onChange(
      'clues',
      next.map((clue, i) => ({ ...clue, position: i + 1 }))
    );
  };
  const add = (kind: string) => {
    const media = snapshot.media.find((asset) => asset.kind === kind && asset.approved);
    onChange('clues', [
      ...clues,
      {
        position: clues.length + 1,
        kind,
        text_content: kind === 'text' ? '' : null,
        media_id: media?.id || null,
        presentation: 'full',
        blur_amount: 0,
        crop_percent: 100,
      },
    ]);
  };
  return (
    <>
      <div className={fieldStyles.editorFields}>
        <Field
          name="category_id"
          label="Entertainment category"
          value={record.category_id}
          options={options(snapshot.categories)}
          onChange={(name, value) => {
            onChange(name, value);
            onChange(
              'answer_id',
              snapshot.items.find((item) => item.category_id === value)?.id || ''
            );
            onChange('accepted_answer_ids', []);
          }}
        />
        <Field
          name="mode_id"
          label="Game mode"
          value={record.mode_id}
          options={options(snapshot.modes)}
          onChange={(name, value) => {
            onChange(name, value);
            const mode = snapshot.modes.find((item) => item.id === value);
            if (mode) {
              onChange('attempt_limit', mode.default_attempts);
              onChange('scores', mode.default_scores);
              const kind = mode.slug === 'quote' ? 'quote' : 'image';
              onChange('clues', [
                {
                  position: 1,
                  kind,
                  text_content: null,
                  media_id:
                    snapshot.media.find((asset) => asset.kind === kind && asset.approved)?.id ||
                    null,
                  presentation: 'full',
                  blur_amount: 0,
                  crop_percent: 100,
                },
              ]);
            }
          }}
        />
        <Field
          name="answer_id"
          label="Correct entertainment item"
          value={record.answer_id}
          options={options(availableItems, 'title')}
          onChange={onChange}
        />
        <Field
          name="release_date"
          label="Publication date (UTC)"
          type="date"
          value={record.release_date}
          onChange={onChange}
        />
        <Field
          name="status"
          label="Lifecycle"
          value={record.status}
          options={['draft', 'scheduled', 'published', 'archived'].map((value) => ({
            value,
            label: value,
          }))}
          onChange={onChange}
        />
        <Field
          name="difficulty"
          label="Difficulty"
          value={record.difficulty}
          options={['easy', 'medium', 'hard'].map((value) => ({ value, label: value }))}
          onChange={onChange}
        />
        <Field
          name="attempt_limit"
          label="Maximum attempts"
          type="number"
          value={record.attempt_limit}
          onChange={onChange}
        />
        <ListField
          name="scores"
          label="Points by attempt"
          values={record.scores}
          onChange={onChange}
          numeric
          help="One comma-separated score for each attempt, in order."
        />
        <div className={cn(fieldStyles.editorField, fieldStyles.wideField)}>
          <label htmlFor="accepted-answers">Additional accepted catalogue items</label>
          <select
            id="accepted-answers"
            multiple
            value={(record.accepted_answer_ids || []) as string[]}
            onChange={(event) =>
              onChange(
                'accepted_answer_ids',
                Array.from(event.target.selectedOptions).map((option) => option.value)
              )
            }
          >
            {availableItems
              .filter((item) => item.id !== record.answer_id)
              .map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.title)} ({String(item.release_year)})
                </option>
              ))}
          </select>
          <p>
            Alternative names for the same item belong in its catalogue aliases. Use this for
            distinct accepted sources.
          </p>
        </div>
      </div>
      <h2 className={fieldStyles.editorSectionTitle}>The reveal sequence</h2>
      <p className={fieldStyles.adminHelp}>
        Reorder clues with the arrows. Image transformations happen on the server, so players cannot
        fetch a clearer original before its reveal.
      </p>
      <div className={styles.clueEditorList}>
        {clues.map((clue, index) => (
          <div className={styles.clueEditor} key={String(clue.id || index)}>
            <div className={styles.clueEditorHeader}>
              <strong>
                Clue {index + 1} · {String(clue.kind)}
              </strong>
              <div>
                <button
                  className={buttonStyles.iconButton}
                  type="button"
                  aria-label={`Move clue ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => reorder(index, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  className={buttonStyles.iconButton}
                  type="button"
                  aria-label={`Move clue ${index + 1} later`}
                  disabled={index === clues.length - 1}
                  onClick={() => reorder(index, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  className={buttonStyles.iconButton}
                  type="button"
                  aria-label={`Remove clue ${index + 1}`}
                  onClick={() =>
                    onChange(
                      'clues',
                      clues
                        .filter((_, i) => i !== index)
                        .map((value, i) => ({ ...value, position: i + 1 }))
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className={fieldStyles.editorFields}>
              {clue.kind === 'text' ? (
                <Field
                  name={`text-${index}`}
                  label="Clue text"
                  type="textarea"
                  value={clue.text_content}
                  onChange={(_, value) => changeClue(index, 'text_content', value)}
                />
              ) : (
                <Field
                  name={`media-${index}`}
                  label="Licensed asset"
                  value={clue.media_id}
                  options={[
                    { value: '', label: 'Select approved media' },
                    ...options(
                      snapshot.media.filter((media) => media.kind === clue.kind && media.approved),
                      'slug'
                    ),
                  ]}
                  onChange={(_, value) => changeClue(index, 'media_id', value)}
                />
              )}{' '}
              {clue.kind === 'image' && mode?.slug === 'classic' && index > 0 && (
                <Field
                  name={`text-${index}`}
                  label="Fact unlocked by this scene (Year: 1922)"
                  type="textarea"
                  value={clue.text_content}
                  onChange={(_, value) => changeClue(index, 'text_content', value)}
                />
              )}
              {clue.kind === 'image' && (
                <>
                  <Field
                    name={`presentation-${index}`}
                    label="Presentation"
                    value={clue.presentation}
                    options={['full', 'crop', 'blur'].map((value) => ({ value, label: value }))}
                    onChange={(_, value) => changeClue(index, 'presentation', value)}
                  />
                  <Field
                    name={`blur-${index}`}
                    label="Blur strength (0–100)"
                    type="number"
                    value={clue.blur_amount}
                    onChange={(_, value) => changeClue(index, 'blur_amount', value)}
                  />
                  <Field
                    name={`crop-${index}`}
                    label="Visible centre crop (10–100%)"
                    type="number"
                    value={clue.crop_percent}
                    onChange={(_, value) => changeClue(index, 'crop_percent', value)}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.editorAddActions}>
        {(mode?.slug === 'classic'
          ? ['image']
          : mode?.slug === 'one-frame'
            ? []
            : ['image', 'text', 'quote']
        ).map((kind) => (
          <Button
            key={kind}
            variant="secondary"
            size="small"
            disabled={clues.length >= 12}
            onClick={() => add(kind)}
          >
            <Plus size={14} />
            Add {kind} clue
          </Button>
        ))}
      </div>
    </>
  );
};

export default ChallengeEditor;
