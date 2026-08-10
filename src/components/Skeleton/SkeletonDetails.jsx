export default function SkeletonDetails(){
  return (
    <div className="skeleton skeleton--card" aria-hidden="true">
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div className="skeleton skeleton--details-line" style={{width:'50%'}} />
        <div className="skeleton skeleton--details-line" style={{width:'80%'}} />
        <div className="skeleton skeleton--details-line" style={{width:'30%'}} />
      </div>
    </div>
  )
}
