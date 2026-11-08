"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, ArrowRight, BookOpen, Clock } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicBlogPostBySlug, BlogPost } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

export default function BlogPostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { copy } = usePublicContent();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPublicBlogPostBySlug(slug)
      .then((data) => {
        if (mounted) setPost(data);
      })
      .catch(() => {
        if (mounted) setPost(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-[70vh] py-16 sm:py-24 bg-white dark:bg-gray-950">
        <div className="container-x max-w-4xl space-y-10">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Articles</span>
          </Link>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4 rounded-xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : !post ? (
            <div className="text-center py-20 rounded-3xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-8 space-y-3">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto opacity-60" />
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                Article Not Found
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                The article you are looking for may have been moved or unpublished.
              </p>
              <div className="pt-2">
                <Button href="/blog" variant="outline" size="sm">
                  Return to Blog
                </Button>
              </div>
            </div>
          ) : (
            <article className="space-y-8">
              {/* Header */}
              <div className="space-y-4">
                {post.publishedDate && (
                  <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{post.publishedDate}</span>
                  </div>
                )}

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-950 dark:text-white leading-[1.12]">
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 font-normal border-l-2 border-primary/50 pl-4 py-1">
                    {post.excerpt}
                  </p>
                )}
              </div>

              {/* Cover Image */}
              {post.coverImageUrl && (
                <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md">
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Body */}
              <div className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line pt-4">
                {post.body}
              </div>

              {/* Bottom Consultation Banner */}
              <div className="mt-16 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1 max-w-lg">
                  <h3 className="font-display text-xl font-bold text-gray-950 dark:text-white">
                    Need Personalized Dental Advice?
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Schedule a clinical consultation with one of our specialized dental practitioners.
                  </p>
                </div>
                <Button
                  href="/book"
                  variant="primary"
                  size="lg"
                  className="rounded-full px-6 shadow-md whitespace-nowrap"
                >
                  <span>{copy.book} Consultation</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </article>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
