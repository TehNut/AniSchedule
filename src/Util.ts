import fetch from "node-fetch";

export async function query(query: string, variables?: any) {
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
  }).then(res => res.json());
}

const alIdRegex = /anilist\.co\/anime\/(.\d*)/;
const malIdRegex = /myanimelist\.net\/anime\/(.\d*)/;

export async function getMediaId(input: string): Promise<number | null> {
  // First we try directly parsing the input in case it's the standalone ID
  const output = parseInt(input);
  if (output)
    return output;

  // If that fails, we try parsing it with regex to pull the ID from an AniList link
  let match = alIdRegex.exec(input);
  // If there's a match, parse it and return that
  if (match)
    return parseInt(match[1]);

  // If that fails, we try parsing it with another regex to get an ID from a MAL link
  match = malIdRegex.exec(input);
  // If we can't find a MAL ID in the URL, just return null;
  if (!match)
    return null;

  return await query("query($malId: Int) { Media(idMal: $malId) { id } }", { malId: match[1] }).then(res => {
    if (res.errors) {
      console.log(JSON.stringify(res.errors));
      return;
    }

    return res.data.Media.id;
  });
}