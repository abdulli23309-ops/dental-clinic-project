"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, BookOpen, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicBlogs, BlogPost } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

export default function BlogListingPage() {
  const { copy } = usePublicContent();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPublicBlogs()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setBlogs(data.filter((b) => b.isPublished !== false));
        }
      })
      .catch(() => {
        if (mounted) setBlogs([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-[70vh] py-16 sm:py-24 bg-white dark:bg-gray-950">
        <div className="container-x space-y-12">
          {/* Breadcrumbs & Header */}
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>

            <SectionHeading
              eyebrow="Oral Health & Clinical Dentistry"
              title={copy.blogs}
            />
            <p className="max-w-xl text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Evidence-based clinical guides, oral hygiene advice, and insights into modern aesthetic and reconstructive dentistry.
            </p>
          </div>

          {/* Skeletons */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  className="h-80 rounded-3xl border border-gray-200 dark:border-gray-800"
                />
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-8 space-y-3">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto opacity-60" />
              <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                No articles published yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Check back shortly for new clinical articles from our dental specialists.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogs.map((post) => (
                <article
                  key={post.id || post.slug}
                  className="group rounded-3xl border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 shadow-xs hover:border-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-gradient-to-br from-primary/5 via-primary/10 to-amber-100/20 text-primary">
                          <BookOpen className="h-10 w-10 opacity-70" />
                        </div>
                      )}
                    </div>

                    <div className="p-6 space-y-3">
                      {post.publishedDate && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{post.publishedDate}</span>
                        </div>
                      )}

                      <h2 className="font-display text-lg font-bold text-gray-950 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        <Link href={`/blog/${encodeURIComponent(post.slug)}`}>
                          {post.title}
                        </Link>
                      </h2>

                      {post.excerpt && (
                        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Link
                      href={`/blog/${encodeURIComponent(post.slug)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline"
                    >
                      <span>Read Full Article</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
