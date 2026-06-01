'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BadgeCheck, Users } from 'lucide-react';
import type { ProducerPublic } from '@/types';

export default function ProducerSpotlight({ producers }: { producers: ProducerPublic[] }) {
  if (!producers?.length) return null;
  return (
    <section className="mt-12">
      <h2 className="section-heading mb-5">Top Producers</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {producers.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}>
            <Link href={`/producers/${p.id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-av-lg av-card hover:shadow-card-hover text-center group">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-av-elevated flex items-center justify-center text-2xl font-bold text-av-purple-lt ring-2 ring-av-border group-hover:ring-av-purple transition-all">
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt={p.studioName} className="w-full h-full object-cover" />
                    : p.studioName[0]
                  }
                </div>
                {p.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-av-purple flex items-center justify-center">
                    <BadgeCheck size={11} className="text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-av-text line-clamp-1">{p.studioName}</div>
                <div className="text-[10px] text-av-text-muted flex items-center justify-center gap-1 mt-0.5">
                  <Users size={9} /> {p.followerCount.toLocaleString()}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
