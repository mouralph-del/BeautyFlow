export default function SkeletonList({count=3}){
  return (
    <div style={{display:'grid',gap:12}}>
      {Array.from({length:count}).map((_,i)=> (
        <div key={i} className="skeleton skeleton--list-item" aria-hidden="true" />
      ))}
    </div>
  )
}
