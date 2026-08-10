import mapError from './errorMapper';
import './ErrorMessage.css';

export default function ErrorMessage({error, onRetry, className=''}){
  const {title,message} = mapError(error);
  return (
    <div className={`bf-error ${className}`} role="alert">
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{width:44,height:44,background:'#f6ece6',borderRadius:10,display:'grid',placeItems:'center',color:'#8d5739'}}>!</div>
        <div>
          <div style={{fontWeight:700,color:'#3b2a22'}}>{title}</div>
          <div style={{color:'#6b5a52'}}>{message}</div>
        </div>
      </div>
      {onRetry && <div style={{marginTop:10}}><button className="bf-error__retry" onClick={onRetry}>Tentar novamente</button></div>}
    </div>
  )
}
