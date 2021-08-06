export const BOT_TOKEN = process.env.BOT_TOKEN;
export const MODE = process.env.MODE;
export const DEV_SERVER_ID = process.env.DEV_SERVER_ID;
export const DATA_PATH = "./data.json";
export const SCHEDULE_QUERY = `query($page: Int, $amount: Int = 50, $ids: [Int!]!, $nextDay: Int!, $dateStart: Int) {
  Page(page: $page, perPage: $amount) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(notYetAired: true, mediaId_in: $ids, sort: TIME, airingAt_greater: $dateStart, airingAt_lesser: $nextDay) {
      media {
        id
        siteUrl
        format
        duration
        episodes
        title {
          native
          romaji
          english
        }
        coverImage {
          large
          color
        }
        externalLinks {
          site
          url
        }
      }
      id
      episode
      airingAt
      timeUntilAiring
    }
  }
}`;
export const STREAMING_SITES = [
  "Amazon",
  "AnimeLab",
  "Crunchyroll",
  "Funimation",
  "Hidive",
  "Hulu",
  "Netflix",
  "VRV"
];