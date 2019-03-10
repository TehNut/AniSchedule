const fetch = require("node-fetch");
const streamingSites = [
  "Amazon",
  "Animelab",
  "Crunchyroll",
  "Funimation",
  "Hidive",
  "Hulu",
  "Netflix",
  "Viz"
];

export async function query(query, variables, callback) {
  return fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  }).then(res => res.json()).then(res => callback(res));
}

export function getFromNextDays(days = 1) {
  return new Date(new Date().getTime() + (24 * 60 * 60 * 1000 * days));
}

export function getAnnouncementEmbed(entry, date, upNext = false) {
  let description = `Episode ${entry.episode} of [${entry.media.title.romaji}](${entry.media.siteUrl})${upNext ? "" : " has just aired."}`;
  if (entry.media.externalLinks && entry.media.externalLinks.length > 0) {
    let streamLinks = "";
    let multipleSites = false;
    entry.media.externalLinks.forEach(site => {
      if (streamingSites.includes(site.site)) {
        streamLinks += `${multipleSites ? " | " : ""} [${site.site}](${site.url})`;
        multipleSites = true;
      }
    });

    description += "\n\n" + (streamLinks.length > 0 ? "Watch: " + streamLinks : "No licensed streaming links available");
  }

  return {
    color: parseInt(entry.media.coverImage.color.substr(1), 16),
    thumbnail: {
      url: entry.media.coverImage.large
    },
    author: {
      name: "AniList",
      url: "https://anilist.co",
      icon_url: "https://anilist.co/img/logo_al.png"
    },
    description,
    timestamp: date
  };
}
