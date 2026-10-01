// Full-screen launch screen: shown while the app's data loads on the server.
// Pure HTML + CSS (no JavaScript needed), and it looks the same as the iPhone launch image,
// so opening the home-screen app goes: logo → logo with loader → app, with no black screen.
export default function Splash() {
  return (
    <div className="gv-splash" role="status" aria-label="Loading GrowVika">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.png" alt="GrowVika" className="gv-splash-logo" />
      <div className="gv-splash-bar"><span /></div>
    </div>
  );
}
