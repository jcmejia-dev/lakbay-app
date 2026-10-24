export default function Loading() {
  return (
    <div className="launch-wait" role="status" aria-live="polite" aria-label="Loading Lakbay">
      <div style={{textAlign:'center',padding:'32px'}}>
        <div style={{fontWeight:800,fontSize:'2rem',letterSpacing:'-0.04em'}}>lakbay<span>.</span></div>
        <p style={{marginTop:'10px',opacity:.7}}>Loading your ride...</p>
      </div>
    </div>
  );
}
