import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ImageWithFallback from "../Image/ImageWithFallback";
import Modal from "../Modal/Modal";
import { calculatePromotion } from "../../services/promotions";
import { orderedGalleryServices, promotionForService, resolveGalleryCopy } from "../../utils/galleryPresentation";
import "./GalleryCarousel.css";
import "./GalleryCarouselServices.css";

const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function GalleryDetailsModal({ photo, relations = [], promotions = [], onClose, onSchedule }) {
  const copy = resolveGalleryCopy(photo, relations);
  const available = relations.filter((relation) => relation.service?.active !== false);
  return <Modal isOpen onClose={onClose} title={copy.title} describedBy={copy.description ? "gallery-service-description" : undefined} className="gallery-details-modal" overlayClassName="gallery-modal-overlay" closeOnOverlayClick>
    <button type="button" className="gallery-details-modal__close" aria-label="Fechar detalhes" onClick={onClose}><X /></button>
    <div className="gallery-details-modal__layout">
      {photo?.type === "video" ? <video className="gallery-details-modal__video" src={photo.src} poster={photo.poster} controls autoPlay muted playsInline /> : <ImageWithFallback src={photo?.src} alt={photo?.alt || copy.title} className="gallery-details-modal__media" loading="eager" imgStyle={{ objectPosition: photo?.preferredPosition || "center" }} />}
      <div className="gallery-details-modal__information">
        {copy.description && <p id="gallery-service-description" className="gallery-details-modal__description">{copy.description}</p>}
        {available.length > 0 && <h3 className="gallery-details-modal__services-title">{available.length > 1 ? "Serviços realizados" : "Serviço realizado"}</h3>}
        {available.length > 0 ? <div className="gallery-details-modal__services">{available.map(({ service }) => {
          const promotion = promotionForService(service, promotions);
          const promotional = promotion ? calculatePromotion(service.priceValue, promotion) : null;
          const benefits = Array.isArray(service.benefits) ? service.benefits.slice(0, 3) : [];
          return <article key={service.dbId ?? service.id}><header><strong>{service.title}</strong>{promotion && <span>🔥 Em promoção</span>}</header><p><Clock3 aria-hidden="true" /> {service.duration}</p><div className="gallery-details-modal__price">{promotion && <s>{service.price}</s>}<strong>{promotional ? money(promotional.final) : service.price}</strong></div>{promotional?.saving > 0 && <small>Economia de {money(promotional.saving)}{promotion.ends_at ? ` · válida até ${new Date(promotion.ends_at).toLocaleDateString("pt-BR")}` : ""}</small>}{benefits.length > 0 && <ul className="gallery-details-modal__service-benefits">{benefits.map((benefit) => <li key={typeof benefit === "string" ? benefit : benefit.title}>{typeof benefit === "string" ? benefit : benefit.title}</li>)}</ul>}{available.length > 1 && <button type="button" className="gallery-details-modal__single-schedule" onClick={() => onSchedule([service])}>Agendar somente {service.title}</button>}</article>;
        })}</div> : <p className="gallery-details-modal__fallback">Um resultado realizado com o cuidado e a identidade do Beauty Studio.</p>}
        {available.length > 0 && <><div className="gallery-details-modal__total"><span>Valor total</span><strong>{money(available.reduce((sum, { service }) => { const promotion = promotionForService(service, promotions); return sum + (promotion ? calculatePromotion(service.priceValue, promotion).final : service.priceValue); }, 0))}</strong></div><button type="button" className="gallery-details-modal__schedule" onClick={() => onSchedule(available.map(({ service }) => service))}>{available.length === 1 ? "Agendar este serviço" : "Agendar todos"}</button></>}
      </div>
    </div>
  </Modal>;
}

export default function GalleryCarousel({ items, services = [], promotions = [] }) {
  const navigate = useNavigate();
  const viewportRef = useRef(null);
  const [visibleItems, setVisibleItems] = useState(5);
  const [cardStep, setCardStep] = useState(0);
  const [trackIndex, setTrackIndex] = useState(items.length);
  const [animate, setAnimate] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const loopItems = useMemo(() => [...items, ...items, ...items], [items]);

  useEffect(() => {
    const update = () => {
      const width = viewportRef.current?.clientWidth ?? 0;
      const count = width <= 640 ? 1 : width <= 1000 ? 3 : 5;
      const gap = width <= 640 ? 14 : 18;
      setVisibleItems(count);
      setCardStep((width - gap * (count - 1)) / count + gap);
      setAnimate(false);
      setTrackIndex(items.length + (count === 3 ? 1 : 0));
    };
    update();
    const observer = new ResizeObserver(update);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [items.length]);

  const move = (direction) => { setAnimate(true); setTrackIndex((current) => current + direction); };
  const transition = () => {
    if (trackIndex >= items.length * 2) { setAnimate(false); setTrackIndex(trackIndex - items.length); }
    else if (trackIndex < items.length) { setAnimate(false); setTrackIndex(trackIndex + items.length); }
  };
  const activeDot = ((trackIndex - items.length) % items.length + items.length) % items.length;
  const relations = selectedPhoto ? orderedGalleryServices(selectedPhoto, services) : [];
  const schedule = (selectedServices) => {
    if (!selectedServices.length) return;
    const primary = selectedServices.length === 1
      ? selectedServices[0]
      : relations.find((relation) => relation.isPrimary)?.service || selectedServices[0];
    setSelectedPhoto(null);
    navigate(`/agendamento/${primary.id}`, { state: { preselectedServiceIds: selectedServices.map((service) => service.id) } });
  };
  const loadingForSlide = (index) => index >= trackIndex - 1 && index <= trackIndex + visibleItems ? "eager" : "lazy";

  return <>
    <div className="gallery-carousel">
      <button type="button" className="gallery-carousel__arrow gallery-carousel__arrow--left" aria-label="Item anterior" onClick={() => move(-1)}><ChevronLeft /></button>
      <div className="gallery-carousel__viewport" ref={viewportRef}><div className="gallery-carousel__track" style={{ transform: `translate3d(${-trackIndex * cardStep}px, 0, 0)`, transition: animate ? "transform 480ms ease-in-out" : "none" }} onTransitionEnd={transition}>
        {loopItems.map((item, index) => <article className={`gallery-item gallery-item--${item.type}`} style={{ width: `${Math.max(cardStep - (visibleItems === 1 ? 14 : 18), 0)}px` }} key={`${item.id}-${index}`}><button type="button" aria-label={`Ver detalhes de ${item.alt}`} onClick={() => setSelectedPhoto(item)}>{item.type === "video" ? (item.src ? <video src={item.src} poster={item.poster} autoPlay muted playsInline loop preload="metadata" /> : <span className="gallery-item__video-note">Vídeo em breve</span>) : <ImageWithFallback src={item.src} alt={item.alt} loading={loadingForSlide(index)} />}</button></article>)}
      </div></div>
      <button type="button" className="gallery-carousel__arrow gallery-carousel__arrow--right" aria-label="Próximo item" onClick={() => move(1)}><ChevronRight /></button>
    </div>
    <div className="gallery-carousel__dots" aria-label="Posição do carrossel">{items.map((item, index) => <button type="button" className={activeDot === index ? "active" : ""} aria-label={`Ir para o item ${index + 1}`} aria-current={activeDot === index ? "true" : undefined} onClick={() => { setAnimate(true); setTrackIndex(items.length + index); }} key={item.id} />)}</div>
    {selectedPhoto && <GalleryDetailsModal photo={selectedPhoto} relations={relations} promotions={promotions} onClose={() => setSelectedPhoto(null)} onSchedule={schedule} />}
  </>;
}
