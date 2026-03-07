"use client";

import dynamic from "next/dynamic";
import { Fade } from "react-awesome-reveal";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, A11y, Autoplay, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const BusinessCard = dynamic(() => import("@/app/components/BusinessCard"), {
  ssr: false,
});

export default function FeaturedBusinessesCarousel({ businesses = [] }) {
  if (!businesses.length) return null;

  return (
    <>
      <Swiper
        modules={[Pagination, A11y, Autoplay, Mousewheel]}
        spaceBetween={14}
        slidesPerView={1.5}
        breakpoints={{
          640: { slidesPerView: 2.5, spaceBetween: 16 },
          1024: { slidesPerView: 3.5, spaceBetween: 18 },
        }}
        pagination={{ clickable: true }}
        className="featured-businesses-swiper !pb-10"
        style={{ paddingLeft: 4, paddingRight: 4 }}
        loop={true}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        mousewheel={{ forceToAxis: true, releaseOnEdges: true }}
      >
        <Fade cascade damping={0.18} triggerOnce>
          {businesses.map((business) => (
            <SwiperSlide key={business.id} className="!h-auto flex">
              <BusinessCard business={business} compact />
            </SwiperSlide>
          ))}
        </Fade>
      </Swiper>

      <style jsx global>{`
        .featured-businesses-swiper .swiper-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .featured-businesses-swiper .swiper-pagination-bullet {
          position: relative;
          width: 44px !important;
          height: 44px !important;
          margin: 0 !important;
          background: transparent !important;
          opacity: 1 !important;
        }

        .featured-businesses-swiper .swiper-pagination-bullet::after {
          content: "";
          position: absolute;
          top: 17px;
          left: 17px;
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #10b981;
          opacity: 0.8;
        }

        .featured-businesses-swiper .swiper-pagination-bullet-active::after {
          background: #047857;
          opacity: 1;
        }
      `}</style>
    </>
  );
}
