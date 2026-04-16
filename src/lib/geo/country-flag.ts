/** Rough country name → flag emoji for display (not exhaustive). */
const NAME_TO_FLAG: Record<string, string> = {
  australia: "🇦🇺",
  austria: "🇦🇹",
  belgium: "🇧🇪",
  brazil: "🇧🇷",
  canada: "🇨🇦",
  china: "🇨🇳",
  denmark: "🇩🇰",
  finland: "🇫🇮",
  france: "🇫🇷",
  germany: "🇩🇪",
  india: "🇮🇳",
  ireland: "🇮🇪",
  israel: "🇮🇱",
  italy: "🇮🇹",
  japan: "🇯🇵",
  mexico: "🇲🇽",
  netherlands: "🇳🇱",
  "new zealand": "🇳🇿",
  norway: "🇳🇴",
  portugal: "🇵🇹",
  singapore: "🇸🇬",
  "south africa": "🇿🇦",
  "south korea": "🇰🇷",
  spain: "🇪🇸",
  sweden: "🇸🇪",
  switzerland: "🇨🇭",
  "united arab emirates": "🇦🇪",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  england: "🇬🇧",
  scotland: "🇬🇧",
  wales: "🇬🇧",
  "united states": "🇺🇸",
  usa: "🇺🇸",
  us: "🇺🇸",
};

export function countryFlagEmoji(country: string | null | undefined): string {
  if (!country?.trim()) return "🌍";
  const key = country.trim().toLowerCase();
  if (NAME_TO_FLAG[key]) return NAME_TO_FLAG[key];
  const found = Object.keys(NAME_TO_FLAG).find((k) => key.includes(k) || k.includes(key));
  if (found) return NAME_TO_FLAG[found];
  return "🌍";
}
