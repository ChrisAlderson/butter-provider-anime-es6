'use strict';

const Generic = require('butter-provider');
const request = require('request');
const sanitize = require('butter-sanitize');

class AnimeApi extends Generic {

  constructor(args) {
    super(args);

    if (args.apiURL) this.apiURL = args.apiURL.split(',');

    this.language = args.language;
    this.quality = args.quality;
    this.translate = args.translate;
  }

  _formatForPopcornFetch(animes) {
    const results = animes.map(anime => {
      return {
        images: anime.images,
        mal_id: anime._id,
        haru_id: anime._id,
        tvdb_id: 'mal-' + anime._id,
        imdb_id: anime._id,
        slug: anime.slug,
        title: anime.title,
        year: anime.year,
        type: anime.type,
        item_data: anime.type,
        rating: anime.rating
      };
    });

    return {
      results: sanitize(results),
      hasMore: true
    };
  };

  _formatForPopcornDetail(anime) {
    let result = {
      mal_id: anime._id,
      haru_id: anime._id,
      tvdb_id: 'mal-' + anime._id,
      imdb_id: anime._id,
      slug: anime.slug,
      title: anime.title,
      item_data: anime.type,
      country: 'Japan',
      genre: anime.genres,
      genres: anime.genres,
      num_seasons: 1,
      runtime: anime.runtime,
      status: anime.status,
      synopsis: anime.synopsis,
      network: [], //FIXME
      rating: anime.rating,
      images: anime.images,
      year: anime.year,
      type: anime.type
    };

    if (anime.type === 'show') {
      result = Object.assign(result, {
        episodes: anime.episodes
      });
    }

    return sanitize(result);
  };

  _processCloudFlareHack(options, url) {
    const match = url.match(/^cloudflare\+(.*):\/\/(.*)/);
    if (match) {
      options = Object.assign(options, {
        uri: `${match[1]}://cloudflare.com/`,
        headers: {
          'Host': match[2],
          'User-Agent': 'Mozilla/5.0 (Linux) AppleWebkit/534.30 (KHTML, like Gecko) PT/3.8.0'
        }
      });
    }
    return options;
  }

  _get(index, url, qs) {
    const req = this._processCloudFlareHack({
      url,
      json: true,
      qs
    }, this.apiURL[index]);
    console.info(`Request to AnimeApi: ${req.url}`);

    return new Promise((resolve, reject) => {
      return request.get(req, (err, res, data) => {
        if (err || res.statusCode >= 400) {
          console.warn(`AnimeApi endpoint '${this.apiURL[index]}' failed.`);
          if (index + 1 >= this.apiURL.length) {
            return reject(err || 'Status Code is above 400');
          } else {
            return this._get(index++, url);
          }
        } else if (!data || data.error) {
          err = data ? data.status_message : 'No data returned';
          console.error(`AnimeApi error: ${err}`);
          return reject(err);
        } else {
          return resolve(data);
        }
      });
    });
  }

  extractIds(items) {
    return items.results.map(item => item.mal_id);
  }

  fetch(filters) {
    const params = {
      sort: 'seeds',
      limit: '50'
    };

    if (filters.keywords) params.keywords = filters.keywords.replace(/\s/g, '% ');
    if (filters.genre)   params.genre = filters.genre;
    if (filters.order) params.order = filters.order;
    if (filters.sorter && filters.sorter !== 'popularity') params.sort = filters.sorter;

    const index = 0;
    const url = `${this.apiURL[index]}animes/${filters.page}`;
    return this._get(index, url, params).then(this._formatForPopcornFetch);
  }

  detail(torrent_id, old_data, debug) {
    const index = 0;
    const url = `${this.apiURL[index]}anime/${torrent_id}`;
    return this._get(index, url).then(this._formatForPopcornDetail);
  }

}

AnimeApi.prototype.config = {
  name: 'AnimeApi',
  uniqueId: 'mal_id',
  tabName: 'AnimeApi',
  type: 'anime',
  metadata: 'trakttv:anime-metadata'
};

module.exports = AnimeApi;
