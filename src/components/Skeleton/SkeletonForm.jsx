export default function SkeletonForm({rows=4}){
  return (
    <div style={{display:'flex',flexDirection:'column'}}>
      {Array.from({length:rows}).map((_,i)=>(
        <div key={i} className="skeleton skeleton--form-row" aria-hidden="true" />
      ))}
    </div>
  )
}
