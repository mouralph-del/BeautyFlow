import { useEffect, useRef, useState } from "react";

export default function ImageWithFallback({ src, alt = "", className = "", style = {}, imgStyle = {}, loading = "lazy", decoding = "async" }) {
  const imageRef = useRef(null);
  const [status, setStatus] = useState(src ? "loading" : "empty");
  useEffect(() => {
    if (!src) { setStatus("empty"); return; }
    setStatus("loading");
    const image = imageRef.current;
    if (image?.complete) setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);
  if (!src) return <div className={className} style={{ background: "#f5efe9", display: "grid", placeItems: "center", color: "#7a6a60", ...style }}>Imagem não disponível</div>;
  return <div className={className} data-image-state={status} style={{ position: "relative", overflow: "hidden", ...style }}>
    {status === "loading" && <div data-image-skeleton style={{ position: "absolute", inset: 0, zIndex: 1, background: "#f5efe9" }} aria-hidden="true" />}
    <img ref={imageRef} src={src} alt={alt} loading={loading} decoding={decoding} data-media-state={status} style={{ display: "block", opacity: status === "loaded" ? 1 : 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity 180ms ease", ...imgStyle }} onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} />
    {status === "error" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#7a6a60", background: "#f5efe9" }}>Imagem indisponível</div>}
  </div>;
}
