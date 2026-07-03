// Standalone script: compute a player's average match rating for a club,
// optionally excluding matches with an exact rating (e.g. the default 3.0 "no data" rating).
//
// Usage:
//   node scripts/player-rating.mjs "<club name>" "<player name>" [excludeRating] [platform]
//
// Examples:
//   node scripts/player-rating.mjs "Macabi Del Aviv" "d.del"
//   node scripts/player-rating.mjs "Macabi Del Aviv" "d.del" 3.0 common-gen5

const [, , clubNameArg, playerNameArg, excludeRatingArg, platformArg] = process.argv;

if (!clubNameArg || !playerNameArg) {
  console.error('Usage: node scripts/player-rating.mjs "<club name>" "<player name>" [excludeRating] [platform]');
  process.exit(1);
}

const EXCLUDE_RATING = excludeRatingArg !== undefined ? Number(excludeRatingArg) : 3.0;
const PLATFORMS = platformArg ? [platformArg] : ["common-gen4", "common-gen5"];

const HEADERS = {
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.ea.com",
  Referer: "https://www.ea.com/games/ea-sports-fc/clubs/rankings",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const BASE = "https://proclubs.ea.com/api/fc";

async function eaGet(path, params) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`EA API error ${res.status} for ${path} (${url})`);
  return res.json();
}

async function findClub(clubName, platform) {
  const results = await eaGet("allTimeLeaderboard/search", { platform, clubName });
  if (!Array.isArray(results) || results.length === 0) return null;
  const lower = clubName.toLowerCase();
  const exact = results.find((r) => (r.clubName || r.clubInfo?.name || "").toLowerCase() === lower);
  return exact || results[0];
}

async function fetchMatches(clubId, matchType, platform, maxResultCount = 20) {
  try {
    return await eaGet("clubs/matches", { platform, clubIds: clubId, matchType, maxResultCount });
  } catch (e) {
    console.error(`  (warn) failed to fetch ${matchType}: ${e.message}`);
    return [];
  }
}

function normalizeClubsField(clubs) {
  if (Array.isArray(clubs)) return clubs;
  return Object.entries(clubs || {}).map(([clubId, row]) => ({ clubId, ...row }));
}

async function run() {
  let club = null;
  let platformUsed = null;

  for (const platform of PLATFORMS) {
    console.log(`Searching for club "${clubNameArg}" on platform ${platform}...`);
    club = await findClub(clubNameArg, platform);
    if (club) {
      platformUsed = platform;
      break;
    }
  }

  if (!club) {
    console.error(`Could not find a club matching "${clubNameArg}" on platform(s): ${PLATFORMS.join(", ")}`);
    process.exit(1);
  }

  const clubId = club.clubId || club.clubInfo?.clubId;
  console.log(`Found club: ${club.clubName || club.clubInfo?.name} (clubId=${clubId}, platform=${platformUsed})`);

  const [league, playoff, friendly] = await Promise.all([
    fetchMatches(clubId, "leagueMatch", platformUsed),
    fetchMatches(clubId, "playoffMatch", platformUsed),
    fetchMatches(clubId, "friendlyMatch", platformUsed),
  ]);

  const allMatches = [...league, ...playoff, ...friendly];
  console.log(`Fetched ${allMatches.length} total matches (league=${league.length}, playoff=${playoff.length}, friendly=${friendly.length})`);

  const targetLower = playerNameArg.toLowerCase();
  const ratings = [];
  const excludedCount = { total: 0 };

  for (const match of allMatches) {
    const playersByClub = match.players || {};
    const clubPlayers = playersByClub[String(clubId)] || playersByClub[clubId] || {};
    for (const player of Object.values(clubPlayers)) {
      const name = (player.playername || "").toLowerCase();
      if (name === targetLower || name.includes(targetLower)) {
        const rating = Number(player.rating);
        if (Number.isNaN(rating)) continue;
        if (rating === EXCLUDE_RATING) {
          excludedCount.total += 1;
          continue;
        }
        ratings.push({ rating, matchId: match.matchId, timestamp: match.timestamp });
      }
    }
  }

  if (ratings.length === 0) {
    console.error(`No matches found with a player named "${playerNameArg}" (after excluding rating ${EXCLUDE_RATING}).`);
    console.error(`Excluded ${excludedCount.total} appearance(s) with rating === ${EXCLUDE_RATING}.`);
    process.exit(1);
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const avg = sum / ratings.length;

  console.log("\n--- Result ---");
  console.log(`Player: ${playerNameArg}`);
  console.log(`Club: ${club.clubName || club.clubInfo?.name}`);
  console.log(`Games counted: ${ratings.length}`);
  console.log(`Games excluded (rating === ${EXCLUDE_RATING}): ${excludedCount.total}`);
  console.log(`Average rating: ${avg.toFixed(2)}`);
  console.log(`Individual ratings: ${ratings.map((r) => r.rating.toFixed(1)).join(", ")}`);
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
