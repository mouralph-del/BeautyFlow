import './EmptyState.css';

export default function EmptyState({icon:Icon=null, title='Nenhum item', description='', actionLabel, onAction, actionLink}){
  return (
    <div className="bf-empty">
      <div className="bf-empty__icon">{Icon ? <Icon size={36} /> : <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#f6ece6"/></svg>}</div>
      <div className="bf-empty__body">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {actionLabel && (onAction ? <button className="bf-empty__cta" onClick={onAction}>{actionLabel}</button> : actionLink ? <a className="bf-empty__cta" href={actionLink}>{actionLabel}</a> : null)}
      </div>
    </div>
  )
}
