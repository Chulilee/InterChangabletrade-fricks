"use client";

import { useState, type FormEvent } from "react";
import type { Listing } from "@/types/listing";
import { updateListing, deleteListing, getCategories } from "@/services/listingService";

interface ListingEditProps {
  listing: Listing;
  onSaved: () => void;
  onCancel: () => void;
}

export function ListingEdit({
  listing,
  onSaved,
  onCancel,
}: ListingEditProps) {
  const categories = getCategories();
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(listing.price.toString());
  const [category, setCategory] = useState(listing.category);
  const [images, setImages] = useState<string[]>([...listing.images]);
  const [imageInput, setImageInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (title.length > 120) errs.title = "Title must be 120 characters or fewer.";
    if (!description.trim()) errs.description = "Description is required.";
    if (description.length > 2000)
      errs.description = "Description must be 2000 characters or fewer.";
    if (!price || Number(price) <= 0) errs.price = "Price must be greater than 0.";
    if (Number(price) > 100_000_000) errs.price = "Price is too high.";
    if (!category) errs.category = "Category is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleAddImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    if (images.length >= 6) {
      setErrors((e) => ({ ...e, images: "Maximum 6 images allowed." }));
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageInput("");
    setErrors((e) => {
      const next = { ...e };
      delete next.images;
      return next;
    });
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    await updateListing(listing.id, {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      images,
    });
    setSubmitting(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setSubmitting(true);
    await deleteListing(listing.id);
    setSubmitting(false);
    onSaved();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Edit listing</h2>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="text-sm font-medium text-red-500 transition hover:text-red-600 disabled:opacity-40"
        >
          Delete
        </button>
      </div>

      <div>
        <label
          htmlFor="edit-title"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Title
        </label>
        <input
          id="edit-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="edit-desc"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Description
        </label>
        <textarea
          id="edit-desc"
          maxLength={2000}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.description ? (
            <p className="text-xs text-red-600">{errors.description}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-slate-400">{description.length}/2000</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="edit-price"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Price (USDC)
          </label>
          <input
            id="edit-price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {errors.price && (
            <p className="mt-1 text-xs text-red-600">{errors.price}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="edit-category"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Category
          </label>
          <select
            id="edit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Images (max 6)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={imageInput}
            onChange={(e) => setImageInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Add
          </button>
        </div>
        {errors.images && (
          <p className="mt-1 text-xs text-red-600">{errors.images}</p>
        )}
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
              >
                Image {idx + 1}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="ml-0.5 text-slate-400 hover:text-red-500"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
