import { Upload } from 'lucide-react';
import { useState } from 'react';
import ChallengeEditor from '@/components/admin/ChallengeEditor/ChallengeEditor';
import { Field, ListField, options } from '@/components/admin/Fields/Fields';
import fieldStyles from '@/components/admin/Fields/Fields.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import type { AdminRecord, AdminSnapshot, Entity } from '@/features/admin/contracts';
import { cn } from '@/lib/utils';

const RecordEditor = ({
  entity,
  record,
  snapshot,
  onChange,
}: {
  entity: Entity;
  record: AdminRecord;
  snapshot: AdminSnapshot;
  onChange: (name: string, value: unknown) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const upload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok)
        throw new Error('Could not upload this image. Use JPEG, PNG or WebP under 10 MB.');
      onChange('storage_path', data.storagePath);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };
  if (entity === 'challenge')
    return <ChallengeEditor record={record} snapshot={snapshot} onChange={onChange} />;
  return (
    <div className={fieldStyles.editorFields}>
      <Field
        name="slug"
        label="Stable URL slug"
        value={record.slug}
        onChange={onChange}
        help="Lowercase letters/numbers separated by hyphens."
      />
      {entity === 'item' ? (
        <>
          <Field
            name="title"
            label="Entertainment title"
            value={record.title}
            onChange={onChange}
          />
          <Field
            name="category_id"
            label="Category"
            value={record.category_id}
            options={options(snapshot.categories)}
            onChange={onChange}
          />
          <Field
            name="release_year"
            label="Release year"
            type="number"
            value={record.release_year}
            onChange={onChange}
          />
          <Field
            name="synopsis"
            label="Original editorial summary"
            type="textarea"
            value={record.synopsis}
            onChange={onChange}
          />
          <ListField
            name="aliases"
            label="Alternative titles"
            values={record.aliases}
            onChange={onChange}
            help="One title per line. Search aliases select this same catalogue item."
          />
          <Field
            name="source_url"
            label="Metadata source URL"
            type="url"
            value={record.source_url}
            onChange={onChange}
          />
          <Field
            name="active"
            label="Available in search"
            type="boolean"
            value={record.active}
            onChange={onChange}
          />
        </>
      ) : entity === 'media' ? (
        <>
          <Field
            name="kind"
            label="Media type"
            value={record.kind}
            options={['image', 'quote'].map((value) => ({ value, label: value }))}
            onChange={onChange}
          />
          {record.kind === 'image' ? (
            <div className={cn(fieldStyles.editorField, fieldStyles.wideField)}>
              <label htmlFor="media-upload">Private image upload</label>
              <input
                id="media-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              <p>
                {uploading
                  ? 'Uploading and stripping embedded metadata…'
                  : String(
                      record.storage_path ||
                        'Upload an authorised image before approving this asset.'
                    )}
              </p>
              {uploadError && (
                <p className={sharedStyles.inlineError} role="alert">
                  {uploadError}
                </p>
              )}
              <span className={fieldStyles.uploadNote}>
                <Upload size={14} />
                Private Veyli bucket · 10 MB maximum
              </span>
            </div>
          ) : (
            <Field
              name="quote_text"
              label="Exact licensed excerpt"
              type="textarea"
              value={record.quote_text}
              onChange={onChange}
            />
          )}
          <Field
            name="author"
            label="Author / required attribution"
            value={record.author}
            onChange={onChange}
          />
          <Field
            name="license"
            label="Licence name / rights basis"
            value={record.license}
            onChange={onChange}
          />
          <Field
            name="license_url"
            label="Licence terms URL"
            type="url"
            value={record.license_url}
            onChange={onChange}
          />
          <Field
            name="source_url"
            label="Original source URL"
            type="url"
            value={record.source_url}
            onChange={onChange}
          />
          <Field
            name="approved"
            label="Rights reviewed for intended distribution"
            type="boolean"
            value={record.approved}
            onChange={onChange}
            help="Metadata-provider access is not permission to use artwork. Unapproved assets cannot enter public challenges."
          />
        </>
      ) : (
        <>
          <Field name="name" label="Display name" value={record.name} onChange={onChange} />
          <Field
            name="description"
            label="Editorial description"
            type="textarea"
            value={record.description}
            onChange={onChange}
          />
          <Field
            name="icon"
            label="Icon name"
            value={record.icon}
            onChange={onChange}
            options={[
              'film',
              'tv',
              'gamepad',
              'music',
              'sparkles',
              'layers',
              'scan',
              'image',
              'quote',
            ].map((value) => ({ value, label: value }))}
          />
          <Field
            name="position"
            label="Display order"
            type="number"
            value={record.position}
            onChange={onChange}
          />
          <Field
            name="active"
            label="Publicly available"
            type="boolean"
            value={record.active}
            onChange={onChange}
          />
          {entity === 'category' ? (
            <Field
              name="accent"
              label="Accent colour"
              type="color"
              value={record.accent}
              onChange={onChange}
            />
          ) : (
            <>
              <Field
                name="initial_clues"
                label="Initially revealed clues"
                type="number"
                value={record.initial_clues}
                onChange={onChange}
              />
              <Field
                name="clues_per_miss"
                label="Clues revealed per miss"
                type="number"
                value={record.clues_per_miss}
                onChange={onChange}
              />
              <Field
                name="default_attempts"
                label="Default attempt limit"
                type="number"
                value={record.default_attempts}
                onChange={onChange}
              />
              <ListField
                name="default_scores"
                label="Default points by attempt"
                values={record.default_scores}
                onChange={onChange}
                numeric
                help="A comma-separated score for each possible successful attempt."
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RecordEditor;
