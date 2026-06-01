import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import MovieDetailClient from '@/components/movies/MovieDetailClient';
import { contentApi } from '@/lib/api/content';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const content = await contentApi.getById(params.id);
    return {
      title:       content.title,
      description: content.description.slice(0, 160),
      openGraph: {
        title:  content.title,
        images: [{ url: content.thumbnailUrl }],
      },
    };
  } catch {
    return { title: 'Movie Not Found' };
  }
}

export default async function MovieDetailPage({ params }: Props) {
  let content;
  try {
    content = await contentApi.getById(params.id);
  } catch {
    notFound();
  }

  return (
    <>
      <Navbar />
      <MovieDetailClient content={content} />
    </>
  );
}
