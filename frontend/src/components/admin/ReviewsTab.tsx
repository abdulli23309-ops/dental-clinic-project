"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { adminListReviews as adminGetReviews, adminCreateReview, adminDeleteReview, Review } from "@/lib/api";

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState<{
    authorName: string;
    rating: number;
    text: string;
    sourceLabel: string;
    displayOrder: number;
    isPublished: boolean;
  }>({
    authorName: "",
    rating: 5,
    text: "",
    sourceLabel: "",
    displayOrder: 0,
    isPublished: true,
  });

  useEffect(() => {
    adminGetReviews()
      .then((data) => setReviews(data))
      .catch((error) => console.error("Failed to fetch reviews:", error));
  }, []);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminCreateReview({
        ...reviewForm,
      });
      setReviews([...reviews, created]);
      setReviewForm({
        authorName: "",
        rating: 5,
        text: "",
        sourceLabel: "",
        displayOrder: 0,
        isPublished: true,
      });
    } catch (error) {
      console.error("Failed to create review:", error);
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await adminDeleteReview(id);
      setReviews(reviews.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete review:", error);
    }
  };

  return (
    <div>
      {/* Form Section */}
      <Card surface="cream" shadow="card" className="p-6 mb-6">
        <form onSubmit={handleCreateReview} className="space-y-4">
          <TextField
            id="rev-author"
            label="Author"
            value={reviewForm.authorName}
            onChange={(e) => setReviewForm({ ...reviewForm, authorName: e.target.value })}
            required
          />
          <TextField
            id="rev-rating"
            label="Rating"
            type="number"
            value={String(reviewForm.rating)}
            onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
            required
          />
          <TextField
            id="rev-text"
            label="Text"
            value={reviewForm.text}
            onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
            required
          />
          <TextField
            id="rev-source"
            label="Source"
            value={reviewForm.sourceLabel}
            onChange={(e) => setReviewForm({ ...reviewForm, sourceLabel: e.target.value })}
          />
          <Button type="submit" variant="primary" size="sm">
            Save Review
          </Button>
        </form>
      </Card>

      {/* List Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-display text-ink mb-4">Reviews List</h2>
        {reviews.length === 0 && (
          <p className="text-ink-soft/60">No reviews yet. Add one above.</p>
        )}
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border border-line bg-bone">
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">{review.authorName}</span>
                <span className="text-ink-soft/60">★ {review.rating}</span>
              </div>
              <p className="text-ink-soft/60 whitespace-break">{review.text.substring(0, 100)}...</p>
              <span className="text-ink-soft/60"> {review.sourceLabel}</span>
              <Button onClick={() => handleDeleteReview(review.id)} variant="secondary" size="sm">
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}