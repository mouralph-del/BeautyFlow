export default function SkeletonCard({className=''}){
  return (
    <div className={`skeleton skeleton--card ${className}`} aria-hidden="true">
      <div style={{display:'flex',gap:12}}>
        <div style={{flex:'0 0 120px',borderRadius:8,background:'rgba(255,255,255,0.02)'}} />
        <div style={{flex:1}}>
          <div className="skeleton skeleton--details-line" style={{width:'60%'}} />
          <div className="skeleton skeleton--details-line" style={{width:'40%'}} />
          <div className="skeleton skeleton--details-line" style={{width:'80%'}} />
        </div>
      </div>
    </div>
  )
}
