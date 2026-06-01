// ─── search.module.ts ────────────────────────────────────────────────────────
import { Module }          from '@nestjs/common';
import { SearchService }   from './search.service';

@Module({
  providers: [SearchService],
  exports:   [SearchService],
})
export class SearchModule {}

// ─── search.service.ts ───────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { Client }             from '@elastic/elasticsearch';

@Injectable()
export class SearchService {
  private readonly log    = new Logger(SearchService.name);
  private readonly client: Client;
  private readonly INDEX  = 'alphaview_content';

  constructor(private readonly cfg: ConfigService) {
    this.client = new Client({
      node: cfg.get('ELASTICSEARCH_URL', 'http://localhost:9200'),
    });
    this._ensureIndex();
  }

  private async _ensureIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.INDEX });
      if (!exists) {
        await this.client.indices.create({
          index: this.INDEX,
          body: {
            mappings: {
              properties: {
                title:        { type: 'text',    analyzer: 'english', boost: 4 },
                description:  { type: 'text',    analyzer: 'english'           },
                genre:        { type: 'keyword'                                 },
                castList:     { type: 'text',    analyzer: 'english', boost: 2 },
                producerName: { type: 'text',    analyzer: 'english'           },
                priceNgn:     { type: 'integer'                                 },
                avgRating:    { type: 'float'                                   },
                viewCount:    { type: 'long'                                    },
                releaseDate:  { type: 'date'                                    },
                status:       { type: 'keyword'                                 },
              },
            },
          },
        });
        this.log.log(`Created Elasticsearch index: ${this.INDEX}`);
      }
    } catch (err) {
      this.log.warn('Elasticsearch not available in this environment');
    }
  }

  async indexContent(content: any) {
    try {
      await this.client.index({
        index: this.INDEX,
        id:    content.id,
        body: {
          title:        content.title,
          description:  content.description,
          genre:        content.genre,
          castList:     content.castList,
          producerName: content.producer?.studioName ?? '',
          priceNgn:     Math.round((content.priceKobo ?? 0) / 100),
          avgRating:    content.avgRating   ?? 0,
          viewCount:    content.viewCount   ?? 0,
          releaseDate:  content.releaseDate ?? null,
          thumbnailUrl: content.thumbnailUrl ?? '',
          status:       content.status,
        },
      });
    } catch (err) {
      this.log.warn(`Failed to index content ${content.id}: ${err.message}`);
    }
  }

  async removeContent(id: string) {
    try {
      await this.client.delete({ index: this.INDEX, id });
    } catch { /* ignore */ }
  }

  async search(q: string, filters: { genre?: string; maxPrice?: number } = {}) {
    try {
      const must: any[] = [{
        multi_match: {
          query:     q,
          fields:    ['title^4', 'castList^2', 'description', 'producerName'],
          fuzziness: 'AUTO',
        },
      }];

      const filter: any[] = [{ term: { status: 'live' } }];
      if (filters.genre)    filter.push({ term:  { genre:    filters.genre    } });
      if (filters.maxPrice) filter.push({ range: { priceNgn: { lte: filters.maxPrice } } });

      const { hits } = await this.client.search({
        index: this.INDEX,
        body: {
          query: { bool: { must, filter } },
          sort:  [{ _score: 'desc' }, { viewCount: 'desc' }],
          size:  40,
        },
      });

      return (hits.hits as any[]).map(h => ({ id: h._id, score: h._score, ...h._source }));
    } catch {
      return [];
    }
  }
}
