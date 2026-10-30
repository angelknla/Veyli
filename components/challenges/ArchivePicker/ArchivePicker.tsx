'use client';

import { useRouter } from 'next/navigation';
import styles from '@/components/challenges/ArchivePicker/ArchivePicker.module.css';

const ArchivePicker = ({ date, min, max }: { date: string; min: string; max: string }) => {
  const router = useRouter();
  return (
    <label className={styles.datePicker}>
      Choose a day
      <input
        type="date"
        value={date}
        min={min}
        max={max}
        onChange={(event) => {
          if (event.target.value && event.target.value <= max)
            router.push(`/archive?date=${event.target.value}`);
        }}
      />
    </label>
  );
};

export default ArchivePicker;
