// Live website preview (Section 6.7): a cheap CSS swap with a big laugh.
export function WebsitePreview({ score }: { score: number }) {
  if (score < 25) {
    return (
      <div class="site geo" aria-label="Website preview: 1999 GeoCities">
        <div class="marquee">~*~ WeLcOmE 2 BeAr HaCkAtHoN ~*~ you are visitor #000004 ~*~</div>
        <span class="uc">🚧 UNDER CONSTRUCTION 🚧</span>
        <div>Sign up!!! (link broken)</div>
      </div>
    );
  }
  if (score < 60) {
    return (
      <div class="site clean" aria-label="Website preview: clean template">
        <div class="nav">Bear Hackathon · About · FAQ · Sponsors</div>
        <div style={{ padding: '4px' }}><b>36 hours. Free food. Bad WiFi.</b><br />[ Register ]</div>
      </div>
    );
  }
  return (
    <div class="site slick" aria-label="Website preview: slick parallax with a cursor-following bear">
      <div class="hero">THE GREATEST HACKATHON OF ALL TIME</div>
      <div style={{ padding: '0 6px' }}>scroll for ✨ parallax ✨</div>
      <span class="bearcursor">🐻</span>
    </div>
  );
}
