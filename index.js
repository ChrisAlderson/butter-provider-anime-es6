'use strict';

const Provider = require('butter-provider');
const request = require('request');
const sanitize = require('butter-sanitize');

class AnimeApi extends Provider {

  constructor(args) {
    super(args);

    if (!(this instanceof AnimeApi)) return new AnimeApi(args);

    this.apiURL = this.args.apiURL;
  }

  _formatFetch(animes) {
    let results = animes.map(anime => {
      return {
        mal_id: anime._id,
        title: anime.title,
        year: anime.year,
        genres: anime.genres,
        rating: anime.rating,
        poster: anime.images.poster,
        type: anime.type
      };

      if (anime.type === Provider.ItemType.TVSHOW) {
        result = Object.assign(result, {
          num_seasons: anime.num_seasons
        });
      } else if (anime.type === Provider.ItemType.MOVIE) {
        result = Object.assign(result, {});
      } else {
        throw new Error(`unssuported item type ${anime.type}`)
      }
    });

    return {
      results: sanitize(results),
      hasMore: true
    };
  };

  _formatDetail(anime) {
    let result = {
      mal_id: anime._id,
      title: anime.title,
      year: anime.year,
      genres: anime.genres,
      rating: anime.rating,
      poster: anime.images.poster,
      type: anime.type,
      runtime: anime.runtime,
      backdrop: anime.images.fanart,
      subtitle: {},
      synopsis: anime.synopsis
    };

    if (anime.type === Provider.ItemType.TVSHOW) {
      result = Object.assign(result, {
        num_seasons: anime.num_seasons,
        status: anime.status,
        episodes: anime.episodes
      });
    } else if (anime.type === Provider.ItemType.MOVIE) {
      result = Object.assign(result, {
        torrents: anime.torrents,
        trailer: anime.trailer
      });
    } else {
      throw new Error(`unssuported item type ${anime.type}`);
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
    return new Promise((resolve, reject) => {
      const options = {
        url: url,
        json: true,
        qs
      };

      const req = this._processCloudFlareHack(options, this.apiURL[index]);
      return request.get(req, (err, res, data) => {
        if (err || res.statusCode >= 400) {
          if (index + 1 >= this.apiURL.length) {
            return reject(err || new Error('Status Code is above 400'));
          } else {
            return resolve(this._get(index++, url));
          }
        } else if (!data || data.error) {
          err = data ? data.status_message : 'No data returned';
          return reject(new Error(err));
        } else {
          return resolve(data);
        }
      });
    });
  }

  extractId(items) {
  	return items.results.map(item => item[MovieApi.prototype.config.uniqueId]);
  }

  fetch(filters, index = 0) {
    const params = {};

    if (filters.keywords) params.keywords = filters.keywords.replace(/\s/g, '% ');
    if (filters.genre)   params.genre = filters.genre;
    if (filters.order) params.order = filters.order;
    if (filters.sorter && filters.sorter !== 'popularity') params.sort = filters.sorter;

    filters.page = filters.page ? filters.page : 1;

    const url = `${this.apiURL[index]}animes/${filters.page}`;
    return this._get(index, url, params).then(data => this._formatFetch(data));
  }

  detail(torrent_id, old_data, debug, index = 0) {
    const url = `${this.apiURL[index]}anime/${torrent_id}`;
    return this._get(index, url).then(data => this._formatDetail(data));
  }

  resolveStream(src, filters, data) {
    filters.lang = filters.lang ? filters.lang : this.lang;
    const qualities = Object.keys(data.torrents);
    filters.quality = filters.quality !== 'none' ? filters.quality : qualities[0];

    return data.langs[filters.lang][filters.quality];
  }

  random(index = 0) {
    const url = `${this.apiURL[index]}random/anime`;
    return this._get(index, url).then(data => this._formatDetail(data));
  }

}

AnimeApi.prototype.config = {
  name: 'AnimeApi',
  uniqueId: 'mal_id',
  tabName: 'AnimeApi',
  filters: {
    sorters: {
     name: 'Name',
     rating: 'Rating',
     year: 'Year'
    },
    genres: {
      all: 'All',
      action: 'Action',
      adventure: 'Adventure',
      comedy: 'Comedy',
      dementia: 'Dementia',
      demons: 'Demons',
      drama: 'Drama',
      ecchi: 'Ecchi',
      fantasy: 'Fantasy',
      game: 'Game',
      'gender bender': 'Gender Bender',
      gore: 'Gore',
      harem: 'Harem',
      historical: 'Historical',
      horror: 'Horror',
      Kids: 'Kids',
      magic: 'Magic',
      'Mahou Shoujo': 'Mahou Shoujo',
      'Nahou Shounen': 'Mahou Shounen',
      'Martial Arts': 'Martial Arts',
      mecha: 'Mecha',
      military: 'Military',
      music: 'Music',
      mystery: 'Mystery',
      parody: 'Parody',
      police: 'Police',
      psychological: 'Psychological',
      racing: 'Racing',
      romance: 'Romance',
      samurai: 'Samurai',
      school: 'School',
      'sci-fi': 'Sci-Fi',
      'shoujo ai': 'Shoujo Ai',
      'shounen ai': 'Shounen Ai',
      'Slice of life': 'Slice of Life',
      space: 'Space',
      sports: 'Sports',
      'super power': 'Super Power',
      supernatural: 'Supernatural',
      thriller: 'Thriller',
      vampire: 'Vampire',
      yuri: 'Yuri',
    },
    types: {
      all: 'All',
      movies: 'Movies',
      tv: 'TV',
      ova: 'OVA',
      ona: 'ONA'
    }
  },
  defaults: {
    apiURL: [
      'https://anime.api-fetch.website/',
      'cloudflare+https://anime.api-fetch.website/'
    ]
  },
  args: {
    apiURL: Provider.ArgType.ARRAY
  }
}

module.exports = AnimeApi;
