"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/ui/section-heading";
import { GalleryImageItem, publicGetGallery, resolveMediaUrl } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { ExpandableImage } from "@/components/ui/expandable-image";

export function Gallery() {
  const { copy, locale } = usePublicContent();
  const [photos, setPhotos] = useState<GalleryImageItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

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

  return (
    <section
      id="gallery"
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F5] dark:bg-gray-900/50 py-28 md:py-36 overflow-hidden"
    >
      <div className="container-x space-y-14 lg:space-y-16">
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

        {/* Masonry Gallery Layout with Shared-Element Lightbox Transitions */}
        {photos.length === 1 ? (
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <ExpandableImage
                src={resolveMediaUrl(firstPhoto.imageUrl) || firstPhoto.imageUrl}
                alt={getLocalizedCaption(firstPhoto.caption) || copy.insideOurClinic}
                caption={getLocalizedCaption(firstPhoto.caption)}
                layoutId={`gallery-single-${firstPhoto.id || firstPhoto.imageUrl}`}
                className="rounded-3xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-gray-800/80 group bg-gray-100 dark:bg-gray-800"
                imgClassName="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              >
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                {firstPhoto.caption && (
                  <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between text-white pointer-events-none">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full mb-2 inline-block">
                        {copy.clinicalSuite}
                      </span>
                      <h3 className="font-display text-lg sm:text-xl font-bold leading-tight drop-shadow-sm">
                        {getLocalizedCaption(firstPhoto.caption)}
                      </h3>
                    </div>
                  </div>
                )}
              </ExpandableImage>
            </motion.div>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 gap-6 [column-fill:_balance]">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id || photo.imageUrl}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.4) }}
                className="break-inside-avoid mb-6"
              >
                <ExpandableImage
                  src={resolveMediaUrl(photo.imageUrl) || photo.imageUrl}
                  alt={getLocalizedCaption(photo.caption) || copy.insideOurClinic}
                  caption={getLocalizedCaption(photo.caption)}
                  layoutId={`gallery-${photo.id || photo.imageUrl}`}
                  className="rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-200/80 dark:border-gray-800/80 group bg-gray-100 dark:bg-gray-800"
                  imgClassName="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                >
                  {/* Anchored bottom text overlay with subtle gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-end justify-between text-white pointer-events-none">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full mb-2 inline-block">
                        {i === 0 ? copy.clinicalSuite : copy.clinicAtmosphere}
                      </span>
                      {photo.caption && (
                        <h3 className="font-display text-base sm:text-lg font-bold leading-tight drop-shadow-sm">
                          {getLocalizedCaption(photo.caption)}
                        </h3>
                      )}
                    </div>
                  </div>
                </ExpandableImage>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Gallery;
