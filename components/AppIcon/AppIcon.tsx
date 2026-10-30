import BrandMark from '@/components/BrandMark/BrandMark';

export const AppIcon = ({ size }: { size: number }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090909',
        color: '#f5f5f2',
      }}
    >
      <BrandMark size={size * 0.66} />
    </div>
  );
};
