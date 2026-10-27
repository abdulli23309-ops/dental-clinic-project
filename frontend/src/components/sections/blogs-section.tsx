"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Calendar, BookOpen } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicBlogs, BlogPost } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function BlogsSection() {
  const { copy } = usePublicContent();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPublicBlogs()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setBlogs(data.filter((b) => b.isPublished !== false).slice(0, 3));
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

  // Hard content rule: if no published posts, render nothing
  if (!isLoading && blogs.length === 0) {
    return null;
  }

  return (
    <section
      id="blogs"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="container-x space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Oral Health Insights"
            title={copy.blogs}
          />

          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
          >
            <span>View All Articles</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-80 rounded-3xl border border-gray-200 dark:border-gray-800"
              />
            ))}
          </div>
        ) : (
          /* 3 Latest Posts Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((post, idx) => (
              <motion.article
                key={post.id || post.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="group rounded-3xl border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 shadow-xs hover:border-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Cover Image or Thematic Placeholder */}
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

                  {/* Content Container */}
                  <div className="p-6 space-y-3">
                    {post.publishedDate && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{post.publishedDate}</span>
                      </div>
                    )}

                    <h3 className="font-display text-lg font-bold text-gray-950 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      <Link href={`/blog/${encodeURIComponent(post.slug)}`}>
                        {post.title}
                      </Link>
                    </h3>

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
                    <span>Read Article</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BlogsSection;
