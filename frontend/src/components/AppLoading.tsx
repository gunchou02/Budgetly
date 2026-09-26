import BrandIllustration from '@/components/BrandIllustration';

export default function AppLoading() {
  return (
    <div className="loading-screen" role="status">
      <div className="app-loading-content">
        <BrandIllustration size={104} priority />
        <span className="loading-bar" aria-hidden="true" />
        <p>読み込み中…</p>
      </div>
    </div>
  );
}
