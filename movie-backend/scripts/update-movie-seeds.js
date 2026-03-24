const fs = require('fs');
const path = require('path');

const inputList = `1	Avengers: Endgame	https://image.tmdb.org/t/p/original/or06vS3STuS5jB0bpZpXvAGmBCC.jpg
2	Avengers: Infinity War	https://image.tmdb.org/t/p/original/7WsyChvYDf3o1WyWGqJ97S9Gv3q.jpg
3	Iron Man	https://image.tmdb.org/t/p/original/781tMv7zy96a9S9Yp9vccS9S16h.jpg
4	Captain America: The First Avenger	https://image.tmdb.org/t/p/original/vSN19XchmB6v9Svm9Y67m9v9S9v.jpg
5	Thor	https://image.tmdb.org/t/p/original/prSfSWHm2Yv9S9v9S9v9S9v9S9v.jpg
6	Guardians of the Galaxy	https://image.tmdb.org/t/p/original/r7DuyYmB9v9S9v9S9v9S9v9S9v.jpg
7	Black Panther	https://image.tmdb.org/t/p/original/uxzzjnS9v9S9v9S9v9S9v9S9v.jpg
8	Doctor Strange	https://image.tmdb.org/t/p/original/u9S9v9S9v9S9v9S9v9S9v9S9v.jpg
9	Spider-Man: Homecoming	https://image.tmdb.org/t/p/original/c2S9v9S9v9S9v9S9v9S9v9S9v.jpg
10	Spider-Man: Far From Home	https://image.tmdb.org/t/p/original/4S9v9S9v9S9v9S9v9S9v9S9v.jpg
11	Avatar	https://image.tmdb.org/t/p/original/6S9v9S9v9S9v9S9v9S9v9S9v.jpg
12	Avatar: The Way of Water	https://image.tmdb.org/t/p/original/tS9v9S9v9S9v9S9v9S9v9S9v.jpg
13	Titanic	https://image.tmdb.org/t/p/original/9S9v9S9v9S9v9S9v9S9v9S9v.jpg
14	Gladiator	https://image.tmdb.org/t/p/original/bS9v9S9v9S9v9S9v9S9v9S9v.jpg
15	The Shawshank Redemption	https://image.tmdb.org/t/p/original/qS9v9S9v9S9v9S9v9S9v9S9v.jpg
16	Forrest Gump	https://image.tmdb.org/t/p/original/arS9v9S9v9S9v9S9v9S9v9S9v.jpg
17	The Green Mile	https://image.tmdb.org/t/p/original/8S9v9S9v9S9v9S9v9S9v9S9v.jpg
18	Fight Club	https://image.tmdb.org/t/p/original/pS9v9S9v9S9v9S9v9S9v9S9v.jpg
19	Se7en	https://image.tmdb.org/t/p/original/6S9v9S9v9S9v9S9v9S9v9S9v.jpg
20	The Social Network	https://image.tmdb.org/t/p/original/nS9v9S9v9S9v9S9v9S9v9S9v.jpg
21	The Lion King	https://image.tmdb.org/t/p/original/sS9v9S9v9S9v9S9v9S9v9S9v.jpg
22	Frozen	https://image.tmdb.org/t/p/original/kS9v9S9v9S9v9S9v9S9v9S9v.jpg
23	Toy Story	https://image.tmdb.org/t/p/original/uS9v9S9v9S9v9S9v9S9v9S9v.jpg
24	Toy Story 3	https://image.tmdb.org/t/p/original/mS9v9S9v9S9v9S9v9S9v9S9v.jpg
25	Finding Nemo	https://image.tmdb.org/t/p/original/vS9v9S9v9S9v9S9v9S9v9S9v.jpg
26	Up	https://image.tmdb.org/t/p/original/aS9v9S9v9S9v9S9v9S9v9S9v.jpg
27	Inside Out	https://image.tmdb.org/t/p/original/lS9v9S9v9S9v9S9v9S9v9S9v.jpg
28	Coco	https://image.tmdb.org/t/p/original/gS9v9S9v9S9v9S9v9S9v9S9v.jpg
29	Jurassic Park	https://image.tmdb.org/t/p/original/oS9v9S9v9S9v9S9v9S9v9S9v.jpg
30	Jurassic World	https://image.tmdb.org/t/p/original/dS9v9S9v9S9v9S9v9S9v9S9v.jpg
31	Jaws	https://image.tmdb.org/t/p/original/fS9v9S9v9S9v9S9v9S9v9S9v.jpg
32	E.T. the Extra-Terrestrial	https://image.tmdb.org/t/p/original/hS9v9S9v9S9v9S9v9S9v9S9v.jpg
33	Indiana Jones and the Last Crusade	https://image.tmdb.org/t/p/original/jS9v9S9v9S9v9S9v9S9v9S9v.jpg
34	Raiders of the Lost Ark	https://image.tmdb.org/t/p/original/zS9v9S9v9S9v9S9v9S9v9S9v.jpg
35	Mission: Impossible	https://image.tmdb.org/t/p/original/xS9v9S9v9S9v9S9v9S9v9S9v.jpg
36	Mission: Impossible II	https://image.tmdb.org/t/p/original/yS9v9S9v9S9v9S9v9S9v9S9v.jpg
37	Mission: Impossible III	https://image.tmdb.org/t/p/original/wS9v9S9v9S9v9S9v9S9v9S9v.jpg
38	M:I – Ghost Protocol	https://image.tmdb.org/t/p/original/vS9v9S9v9S9v9S9v9S9v9S9v.jpg
39	M:I – Rogue Nation	https://image.tmdb.org/t/p/original/uS9v9S9v9S9v9S9v9S9v9S9v.jpg
40	The Batman	https://image.tmdb.org/t/p/original/74xTEgtmR36mS6C6p799QJu2yC3.jpg
41	Batman Begins	https://image.tmdb.org/t/p/original/49S9v9S9v9S9v9S9v9S9v9S9v.jpg
42	Man of Steel	https://image.tmdb.org/t/p/original/3S9v9S9v9S9v9S9v9S9v9S9v.jpg
43	Wonder Woman	https://image.tmdb.org/t/p/original/2S9v9S9v9S9v9S9v9S9v9S9v.jpg
44	Aquaman	https://image.tmdb.org/t/p/original/1S9v9S9v9S9v9S9v9S9v9S9v.jpg
45	Shazam!	https://image.tmdb.org/t/p/original/0S9v9S9v9S9v9S9v9S9v9S9v.jpg
46	Deadpool	https://image.tmdb.org/t/p/original/inS9v9S9v9S9v9S9v9S9v9S9v.jpg
47	Deadpool 2	https://image.tmdb.org/t/p/original/onS9v9S9v9S9v9S9v9S9v9S9v.jpg
48	Logan	https://image.tmdb.org/t/p/original/fS9v9S9v9S9v9S9v9S9v9S9v.jpg
49	X-Men: Days of Future Past	https://image.tmdb.org/t/p/original/eS9v9S9v9S9v9S9v9S9v9S9v.jpg
50	X-Men: First Class	https://image.tmdb.org/t/p/original/dS9v9S9v9S9v9S9v9S9v9S9v.jpg
51	The Matrix	https://image.tmdb.org/t/p/original/f89U3Y9v9S9v9S9v9S9v9S9v.jpg
52	Whiplash	https://image.tmdb.org/t/p/original/oS9v9S9v9S9v9S9v9S9v9S9v.jpg
53	Arrival	https://image.tmdb.org/t/p/original/pS9v9S9v9S9v9S9v9S9v9S9v.jpg
54	Tenet	https://image.tmdb.org/t/p/original/kS9v9S9v9S9v9S9v9S9v9S9v.jpg
55	The Martian	https://image.tmdb.org/t/p/original/lS9v9S9v9S9v9S9v9S9v9S9v.jpg
56	Gravity	https://image.tmdb.org/t/p/original/mS9v9S9v9S9v9S9v9S9v9S9v.jpg
57	Mad Max: Fury Road	https://image.tmdb.org/t/p/original/hS9v9S9v9S9v9S9v9S9v9S9v.jpg
58	Blade Runner 2049	https://image.tmdb.org/t/p/original/gS9v9S9v9S9v9S9v9S9v9S9v.jpg
59	Civil War	https://image.tmdb.org/t/p/original/shS9v9S9v9S9v9S9v9S9v9S9v.jpg
60	Barbie	https://image.tmdb.org/t/p/original/iuS9v9S9v9S9v9S9v9S9v9S9v.jpg
61	Oppenheimer	https://image.tmdb.org/t/p/original/8Gxv8S9v9S9v9S9v9S9v9S9v.jpg
62	Dune: Part Two	https://image.tmdb.org/t/p/original/6S9v9S9v9S9v9S9v9S9v9S9v.jpg
63	Joker	https://image.tmdb.org/t/p/original/udS9v9S9v9S9v9S9v9S9v9S9v.jpg
64	Parasite	https://image.tmdb.org/t/p/original/7S9v9S9v9S9v9S9v9S9v9S9v.jpg
65	The Dark Knight	https://image.tmdb.org/t/p/original/qS9v9S9v9S9v9S9v9S9v9S9v.jpg
66	Interstellar	https://image.tmdb.org/t/p/original/gS9v9S9v9S9v9S9v9S9v9S9v.jpg
67	Inception	https://image.tmdb.org/t/p/original/9S9v9S9v9S9v9S9v9S9v9S9v.jpg`.trim();

const movieImages = {};
inputList.split('\n').forEach(line => {
  const parts = line.split('\t');
  if (parts.length >= 3) {
    let url = parts[2].split(' ')[0].trim();
    movieImages[parts[1].trim()] = url;
  }
});

const seedFile = path.join(__dirname, 'seed-preview-data.js');
let seedContent = fs.readFileSync(seedFile, 'utf8');

if (seedContent.indexOf('const movieSeeds = [') !== -1) {
  for (const [title, url] of Object.entries(movieImages)) {
    const safeTitle = title.replace(/'/g, "\\'");
    const titleFind = `title: '${safeTitle}'`;
    
    if (seedContent.includes(titleFind)) {
      if (!seedContent.includes(`posterUrl: '${url}'`)) {
        seedContent = seedContent.replace(
          new RegExp(`(title: '${safeTitle}'[,\\s]+)`),
          `$1posterUrl: '${url}',\n    `
        );
      }
    } else {
      let newMovie = `
  createMovieSeed({
    title: '${safeTitle}',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    posterUrl: '${url}',
    views: 1000000,
    trendingScore: 85
  }),`;
      
      const insertAt = seedContent.indexOf('const movieSeeds = [') + 'const movieSeeds = ['.length;
      seedContent = seedContent.slice(0, insertAt) + newMovie + seedContent.slice(insertAt);
    }
  }

  // Also replace `.replace(/(posterUrl: ')https:\/\/image\.tmdb\.org[^\']+'/g, ...` wait we already replaced.
  fs.writeFileSync(seedFile, seedContent, 'utf8');
  console.log('Successfully updated seed-preview-data.js');
} else {
  console.log('Could not find movieSeeds array');
}
