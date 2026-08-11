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

export const UserListSkeleton = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Skeleton width="60px" height="85px" borderRadius="8px" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Skeleton width="45%" height="1.3rem" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
              <Skeleton width="30%" height="0.9rem" borderRadius="4px" />
            </div>
            <Skeleton width="60px" height="1.5rem" borderRadius="6px" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem', width: '100%', marginTop: '1.5rem' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

export const FriendsSkeleton = ({ activeTab = 'list' }) => {
  if (activeTab === 'requests') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', marginTop: '1rem' }}>
        <Skeleton width="180px" height="1.4rem" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
        {[1, 2].map((i) => (
          <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Skeleton width="52px" height="52px" borderRadius="50%" style={{ flexShrink: 0 }} />
              <div>
                <Skeleton width="140px" height="1.3rem" borderRadius="6px" style={{ marginBottom: '0.4rem' }} />
                <Skeleton width="100px" height="0.9rem" borderRadius="4px" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <Skeleton width="80px" height="2.2rem" borderRadius="20px" />
              <Skeleton width="80px" height="2.2rem" borderRadius="20px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === 'search') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', marginTop: '1rem' }}>
        {/* My Friend Code Box Skeleton */}
        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Skeleton width="120px" height="0.9rem" borderRadius="4px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="160px" height="1.8rem" borderRadius="8px" />
          </div>
          <Skeleton width="100px" height="2.4rem" borderRadius="20px" />
        </div>

        {/* Search Input Box Skeleton */}
        <div style={{ display: 'flex', gap: '0.8rem', width: '100%' }}>
          <Skeleton height="3rem" borderRadius="30px" style={{ flex: 1 }} />
          <Skeleton width="110px" height="3rem" borderRadius="30px" />
        </div>
      </div>
    );
  }

  // Default: 'list' (My Friends)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', marginTop: '1rem' }}>
      <Skeleton height="2.8rem" borderRadius="30px" style={{ marginBottom: '0.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Skeleton width="56px" height="56px" borderRadius="50%" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Skeleton width="130px" height="1.4rem" borderRadius="6px" style={{ marginBottom: '0.4rem' }} />
              <Skeleton width="90px" height="1rem" borderRadius="4px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MovieDetailSkeleton = () => {
  return (
    <div className="skeleton-movie-detail">
      <div className="skeleton-movie-backdrop">
        <Skeleton height="100%" borderRadius="0px" />
      </div>
      <div className="skeleton-movie-container page-container">
        <div className="skeleton-movie-grid">
          <div className="skeleton-movie-poster">
            <Skeleton height="100%" borderRadius="16px" />
          </div>
          <div className="skeleton-movie-info">
            <Skeleton width="70%" height="3rem" borderRadius="12px" style={{ marginBottom: '1rem' }} />
            <Skeleton width="40%" height="1.4rem" borderRadius="6px" style={{ marginBottom: '1.2rem' }} />
            <Skeleton width="50%" height="1.8rem" borderRadius="20px" style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <Skeleton width="160px" height="3rem" borderRadius="30px" />
              <Skeleton width="160px" height="3rem" borderRadius="30px" />
            </div>
            <Skeleton width="100%" height="4.5rem" borderRadius="10px" style={{ marginBottom: '2rem' }} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} width="60px" height="60px" borderRadius="50%" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
