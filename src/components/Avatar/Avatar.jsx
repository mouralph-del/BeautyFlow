import { useState } from 'react';
import { SkeletonAvatar } from '../Skeleton';

export default function Avatar({src, name='', size=58, alt='Foto da cliente'}){
  const [status,setStatus]=useState(src? 'loading':'empty');
  const initials = (name||'').trim().split(/\s+/)[0]?.charAt(0)?.toUpperCase() || 'C';
  if(status==='empty') return <span className="customer-drawer__avatar" style={{width:size,height:size,display:'grid',placeItems:'center',borderRadius:'50%',background:'#9a6543',color:'#fff',fontFamily:'Georgia,serif',fontSize:Math.floor(size/2)}}>{initials}</span>;
  return (
    <span style={{width:size,height:size,display:'inline-block'}}>
      {status==='loading' && <SkeletonAvatar size={size} />}
      {status!=='empty' && src && <img src={src} alt={alt} style={{width:size,height:size,borderRadius:'50%',display: status==='loaded' ? 'block' : 'none',objectFit:'cover'}} onLoad={()=>setStatus('loaded')} onError={()=>setStatus('error')} />}
      {status==='error' && <span style={{width:size,height:size,display:'grid',placeItems:'center',borderRadius:'50%',background:'#9a6543',color:'#fff',fontFamily:'Georgia,serif',fontSize:Math.floor(size/2)}}>{initials}</span>}
    </span>
  )
}
