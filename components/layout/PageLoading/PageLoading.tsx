import { LoaderCircle } from 'lucide-react';
import styles from '@/components/layout/PageLoading/PageLoading.module.css';

const PageLoading = ({ label = 'Loading…' }: { label?: string }) => {
  return (
    <div className={styles.gameLoading} role="status">
      <LoaderCircle className={'spin'} data-testid="spin" size={28} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
};

export default PageLoading;
