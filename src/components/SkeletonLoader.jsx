import './SkeletonLoader.css';

export const Skeleton = ({ width, height, borderRadius, style, className = '' }) => {
  return (
    <div
      className={`skeleton-base ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
        borderRadius: borderRadius || '4px',
        ...style
      }}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="skeleton-card">
      <Skeleton height="100%" borderRadius="12px" />
    </div>
  );
};

export const MovieRowSkeleton = () => {
  return (
    <div className="skeleton-row-container">
      <div className="skeleton-row-header">
        <Skeleton width="200px" height="2rem" borderRadius="8px" />
      </div>
      <div className="skeleton-row-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const HeroSkeleton = () => {
  return (
    <div className="skeleton-hero">
      <div className="skeleton-hero-content">
        <Skeleton width="65%" height="3.2rem" borderRadius="12px" style={{ marginBottom: '1.2rem' }} />
        <Skeleton width="35%" height="1.4rem" borderRadius="8px" style={{ marginBottom: '1rem' }} />
        <Skeleton width="45%" height="1.2rem" borderRadius="6px" style={{ marginBottom: '1.5rem' }} />
        <Skeleton width="85%" height="3.5rem" borderRadius="8px" style={{ marginBottom: '2rem' }} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Skeleton width="180px" height="3rem" borderRadius="12px" />
          <Skeleton width="140px" height="3rem" borderRadius="12px" />
        </div>
      </div>
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="skeleton-profile page-container">
      {/* Hero Banner Skeleton */}
      <div className="skeleton-profile-hero">
        <div className="skeleton-profile-avatar">
          <Skeleton width="96px" height="96px" borderRadius="50%" />
        </div>
        <div className="skeleton-profile-info">
          <Skeleton width="220px" height="2.2rem" borderRadius="10px" style={{ marginBottom: '0.6rem' }} />
          <Skeleton width="180px" height="1.2rem" borderRadius="6px" style={{ marginBottom: '0.8rem' }} />
          <Skeleton width="150px" height="1.8rem" borderRadius="20px" style={{ marginBottom: '1rem' }} />
          <Skeleton width="130px" height="2.5rem" borderRadius="25px" />
        </div>
      </div>

      {/* Glass Cards Grid Skeleton */}
      <div className="skeleton-profile-cards">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-profile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', width: '100%' }}>
              <Skeleton width="52px" height="52px" borderRadius="16px" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton width="140px" height="1.4rem" borderRadius="8px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="90%" height="1rem" borderRadius="6px" />
              </div>
            </div>
            <Skeleton width="120px" height="2.2rem" borderRadius="30px" style={{ marginTop: '0.8rem', flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* My Library Container Skeleton */}
      <div className="skeleton-profile-library">
        <div style={{ marginBottom: '1.5rem' }}>
          <Skeleton width="180px" height="1.8rem" borderRadius="8px" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width="240px" height="1rem" borderRadius="6px" />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <Skeleton width="120px" height="2.5rem" borderRadius="30px" />
          <Skeleton width="120px" height="2.5rem" borderRadius="30px" />
          <Skeleton width="120px" height="2.5rem" borderRadius="30px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-profile-item">
              <Skeleton width="60px" height="85px" borderRadius="8px" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton width="50%" height="1.2rem" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="35%" height="0.9rem" borderRadius="4px" />
              </div>
              <Skeleton width="60px" height="1.5rem" borderRadius="6px" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
