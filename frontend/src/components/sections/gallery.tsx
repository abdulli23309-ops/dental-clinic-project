"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/ui/section-heading";
import { GalleryImageItem, publicGetGallery, resolveMediaUrl } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function Gallery() {
  const { copy, locale } = usePublicContent();
  const [photos, setPhotos] = useState<GalleryImageItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadGallery() {
      try {
        const data = await publicGetGallery();
        if (isMounted) {
          setPhotos(data || []);
        }
      } catch {
        if (isMounted) {
          setPhotos([]);
        }
      } finally {
        if (isMounted) {
          setHasLoaded(true);
        }
      }
    }
    loadGallery();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to translate caption if available in ui-copy, or fallback to custom admin text
  const getLocalizedCaption = (caption?: string | null) => {
    if (!caption) return "";
    if (locale === "ur" && copy.galleryCaptions && copy.galleryCaptions[caption]) {
      return copy.galleryCaptions[caption];
    }
    return caption;
  };

  // If there are no images once loaded, hide the entire section (return null)
  if (hasLoaded && photos.length === 0) {
    return null;
  }

  // Before loading, don't show an empty jarring gap
  if (!hasLoaded) {
    return null;
  }

  const firstPhoto = photos[0];
  const sidePhotos = photos.slice(1, 4);
  const extraPhotos = photos.slice(4);

  return (
    <section
      id="gallery"
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F5] dark:bg-gray-900/50 py-20 md:py-28 overflow-hidden"
    >
      <div className="container-x space-y-12">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow={copy.galleryEyebrow}
            title={copy.galleryTitle}
          />
          <p className="max-w-md text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {copy.galleryDesc}
          </p>
        </div>

        {/* Dynamic Gallery Grid */}
        {photos.length === 1 ? (
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              onClick={() => setSelectedImage(resolveMediaUrl(firstPhoto.imageUrl) || firstPhoto.imageUrl)}
              className="relative min-h-[380px] sm:min-h-[480px] rounded-3xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-gray-800/80 group bg-gray-100 dark:bg-gray-800 cursor-pointer"
            >
              <Image
                src={resolveMediaUrl(firstPhoto.imageUrl) || firstPhoto.imageUrl}
                alt={getLocalizedCaption(firstPhoto.caption) || copy.insideOurClinic}
                fill
                unoptimized
                sizes="100vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />
              {firstPhoto.caption && (
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full mb-2 inline-block">
                      {copy.clinicalSuite}
                    </span>
                    <h3 className="font-display text-lg sm:text-xl font-bold leading-tight">
                      {getLocalizedCaption(firstPhoto.caption)}
                    </h3>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Main Feature Image (Left, 7 Columns) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                onClick={() => setSelectedImage(resolveMediaUrl(firstPhoto.imageUrl) || firstPhoto.imageUrl)}
                className={`${
                  sidePhotos.length === 0 ? "md:col-span-12" : "md:col-span-7"
                } relative min-h-[340px] sm:min-h-[440px] rounded-3xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-gray-800/80 group bg-gray-100 dark:bg-gray-800 cursor-pointer`}
              >
                <Image
                  src={resolveMediaUrl(firstPhoto.imageUrl) || firstPhoto.imageUrl}
                  alt={getLocalizedCaption(firstPhoto.caption) || copy.insideOurClinic}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full mb-2 inline-block">
                      {copy.clinicalSuite}
                    </span>
                    {firstPhoto.caption && (
                      <h3 className="font-display text-lg sm:text-xl font-bold leading-tight">
                        {getLocalizedCaption(firstPhoto.caption)}
                      </h3>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Right Column Grid (5 Columns with up to 3 Cards) */}
              {sidePhotos.length > 0 && (
                <div
                  className={`md:col-span-5 grid grid-cols-1 ${
                    sidePhotos.length === 1 ? "" : "sm:grid-cols-2 md:grid-cols-1"
                  } gap-6`}
                >
                  {sidePhotos.map((photo, i) => (
                    <motion.div
                      key={photo.id || photo.imageUrl}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5, delay: (i + 1) * 0.1 }}
                      onClick={() => setSelectedImage(resolveMediaUrl(photo.imageUrl) || photo.imageUrl)}
                      className="relative min-h-[190px] sm:min-h-[200px] rounded-3xl overflow-hidden shadow-md border border-gray-200/80 dark:border-gray-800/80 group bg-gray-100 dark:bg-gray-800 cursor-pointer"
                    >
                      <Image
                        src={resolveMediaUrl(photo.imageUrl) || photo.imageUrl}
                        alt={getLocalizedCaption(photo.caption) || copy.insideOurClinic}
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full mb-1 inline-block">
                            {copy.clinicAtmosphere}
                          </span>
                          {photo.caption && (
                            <h4 className="font-display text-sm font-semibold leading-tight">
                              {getLocalizedCaption(photo.caption)}
                            </h4>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Extra photos if more than 4 images */}
            {extraPhotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
                {extraPhotos.map((photo, i) => (
                  <motion.div
                    key={photo.id || photo.imageUrl}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: (i + 1) * 0.08 }}
                    onClick={() => setSelectedImage(resolveMediaUrl(photo.imageUrl) || photo.imageUrl)}
                    className="relative min-h-[220px] rounded-3xl overflow-hidden shadow-md border border-gray-200/80 dark:border-gray-800/80 group bg-gray-100 dark:bg-gray-800 cursor-pointer"
                  >
                    <Image
                      src={resolveMediaUrl(photo.imageUrl) || photo.imageUrl}
                      alt={getLocalizedCaption(photo.caption) || copy.insideOurClinic}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                      <div>
                        {photo.caption && (
                          <h4 className="font-display text-sm font-semibold leading-tight">
                            {getLocalizedCaption(photo.caption)}
                          </h4>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen Lightbox Overlay */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm animate-in fade-in duration-200"
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 text-white text-xl font-bold bg-white/10 hover:bg-white/25 rounded-full h-11 w-11 flex items-center justify-center transition-colors cursor-pointer z-10"
            aria-label={copy.closeImagePreview}
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt={copy.expandedClinicView}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}

export default Gallery;
