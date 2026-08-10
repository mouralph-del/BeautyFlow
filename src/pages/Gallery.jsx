import { useEffect, useState } from "react";
import GalleryCarousel from "../components/GalleryCarousel/GalleryCarousel";
import { InstagramIcon } from "../components/BeautyIcons/BeautyIcons";
import resultOne from "../assets/gallery/resultado-01.jpeg";
import resultTwo from "../assets/gallery/resultado-02.jpeg";
import resultThree from "../assets/gallery/resultado-03.jpeg";
import resultFour from "../assets/gallery/resultado-04.jpeg";
import hennaResult from "../assets/gallery/design-com-henna.jpg";
import microbladingResult from "../assets/gallery/microblading.jpg";
import appointmentVideoOne from "../assets/gallery/atendimento-01.mp4";
import appointmentVideoTwo from "../assets/gallery/atendimento-02.mp4";
import Layout from "../layouts/Layout";
import { getGalleryMedia } from "../services/galleryMedia";
import usePublicSettings from "../hooks/usePublicSettings";
import useServiceCatalog from "../hooks/useServiceCatalog";
import usePromotions from "../hooks/usePromotions";
import "./Gallery.css";

const galleryItems = [
  {
    id: "result-one",
    type: "photo",
    src: resultFour,
    alt: "Resultado natural de design de sobrancelhas",
  },
  {
    id: "result-two",
    type: "photo",
    src: resultTwo,
    alt: "Resultado de design de sobrancelhas com henna",
  },
  {
    id: "appointment-video-one",
    type: "video",
    src: appointmentVideoOne,
    poster: resultThree,
    alt: "Vídeo de atendimento no Thaís Santos Beauty Studio",
  },
  {
    id: "result-three",
    type: "photo",
    src: resultThree,
    alt: "Resultado delicado de design de sobrancelhas",
  },
  {
    id: "result-four",
    type: "photo",
    src: resultOne,
    alt: "Resultado de design de sobrancelhas personalizado",
  },
  {
    id: "henna-result",
    type: "photo",
    src: hennaResult,
    alt: "Resultado de design com henna",
  },
  {
    id: "appointment-video-two",
    type: "video",
    src: appointmentVideoTwo,
    poster: hennaResult,
    alt: "Vídeo de procedimento realizado no estúdio",
  },
  {
    id: "microblading-result",
    type: "photo",
    src: microbladingResult,
    alt: "Resultado de microblading fio a fio",
  },
];

function Gallery() {
  const { studio } = usePublicSettings();
  const services = useServiceCatalog();
  const promotions = usePromotions("services");
  const [items, setItems] = useState(galleryItems);

  useEffect(() => {
    let mounted = true;
    getGalleryMedia().then((records) => {
      if (!mounted || !records.length) return;
      const mappedItems = records.map((item) => ({
        id: item.id,
        type: item.media_type,
        src: item.public_url,
        alt: item.alt_text || item.title,
        preferredPosition: item.is_central_video ? "center" : item.preferred_position,
        serviceId: item.service_id ?? null,
        serviceRelations: item.gallery_media_services?.map((relation) => ({ serviceId: relation.service_id, displayOrder: relation.display_order, isPrimary: relation.is_primary })) || (item.service_id ? [{ serviceId: item.service_id, displayOrder: 0, isPrimary: true }] : []),
        title: item.title,
        titleSource: item.title_source,
        customTitle: item.custom_title,
        descriptionSource: item.description_source,
        customDescription: item.custom_description,
        isFeatured: item.is_featured,
      }));
      const centeredIndex = mappedItems.findIndex(
        (item) => item.type === "video" && item.preferredPosition === "center",
      );
      if (centeredIndex >= 0 && mappedItems.length >= 3) {
        const [centered] = mappedItems.splice(centeredIndex, 1);
        mappedItems.splice(2, 0, centered);
      }
      setItems(mappedItems);
    }).catch(() => console.error("Não foi possível carregar a galeria."));
    return () => { mounted = false; };
  }, []);
  return (
    <Layout>
      <div className="gallery-page">
        <section className="gallery-hero">
          <span>Resultados Beauty Studio</span>
          <h1>
            Os <em>detalhes</em> que fazem toda <em>diferença.</em>
          </h1>
          <p>
            Mais do que resultados, cada atendimento é realizado com carinho,
            dedicação e paixão, valorizando a beleza única de cada cliente.
          </p>
        </section>

        <section className="gallery-showcase" aria-label="Galeria de resultados">
          <GalleryCarousel items={items} services={services} promotions={promotions} />
        </section>

        <section className="gallery-instagram">
          <span aria-hidden="true">
            <InstagramIcon />
          </span>
          <h2>{studio.site.instagram_call}</h2>
          <p>
            Visite meu Instagram e descubra diferentes estilos para encontrar
            aquele que mais combina com você.
          </p>
          <a
            href={studio.instagram}
            target="_blank"
            rel="noreferrer"
          >
            <InstagramIcon size={18} />
            @thaissantos.studio
          </a>
        </section>
      </div>

    </Layout>
  );
}

export default Gallery;
