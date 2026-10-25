// Alert pool (Sections 7.4 and 7.4b). Structure is hand-authored; text may use
// mad-lib slots ({member}, {region}, {sponsor}, {food}, ...). Every choice's
// outcome text contains a joke.
import type { AlertDef } from '../core/effects';
import { signSponsor } from '../core/courting';
import { chance, pick } from '../core/rng';
import {
  addTicker, hasRole, hasTech, memberById, pickInviteSponsor, removeMember, removeSponsor, roleSkillSum, startCourting,
} from '../core/helpers';

const ROUNDS = ['pre-seed', 'seed', 'Series A', 'Series B', 'Series C', 'Series D, for the vibes'];
const VALUATIONS = ['$4M', '$20M', '$40M', '$200M', '$1B', '$10B'];
const RUST = { label: 'Rewrite it in Rust', hint: 'Dramatic. Never helpful.' };

const flagN = (s: { flags: Record<string, unknown> }, k: string) => Number(s.flags[k] ?? 0);

export const ALERTS: AlertDef[] = [
  // ─────────────── 7.4 hero beats ───────────────
  {
    id: 'rival_poach', icon: '🌲', title: 'Tree University is poaching {sponsor}!', weight: 3, max: 1,
    body: '{rivalceo} took {sponsor} to a "synergy lunch." It was a boat.',
    when: (s) => s.sponsors.length > 0, defaultChoice: 2,
    choices: [
      { label: 'Counter-offer', cost: 2000, out: { text: 'You matched the boat with a slightly bigger boat. {sponsor} stays.', sponsorMood: 5 } },
      { label: 'Clapback',
        odds: { p: 0.55, win: { text: 'The clapback went viral. {sponsor} is too embarrassed to leave.', treeHype: -4, rep: 2 },
          lose: { text: "The clapback flopped. {sponsor} left a 'thanks for the memories' email." } },
        run: (s, c) => { if (s.flags._lastOdds === 'lose' && c.sponsorId) removeSponsor(s, c.sponsorId); } },
      { label: 'Let them go', out: { text: '{sponsor} is now a Tree sponsor. Their banner already says "synergy."', treeHype: 6 },
        run: (s, c) => { if (c.sponsorId) removeSponsor(s, c.sponsorId); } },
    ],
  },
  {
    id: 'bsod', icon: '🟦', title: 'Blue Screen of Death in {region}', weight: 0, max: 1, foreshadow: 'headline|fs_bsod', region: 'random', tech: true,
    body: 'The club laptop shows a sad face and "a problem has occurred." It has many problems.',
    defaultChoice: 1,
    choices: [
      { label: 'Turn it off and on again', odds: { p: 0.7, win: { text: 'Have you tried turning it off and on again? It worked. It always works.', flags: { bsod: 'rebooted' } },
        lose: { text: 'Off. On. Sad face. It has achieved sentience and chosen sadness.', flags: { bsod: 'haunted' }, mood: -2 } } },
      { label: 'Blame the update', odds: { p: 0.4, win: { text: 'The update apologized. Rebooted. Fixed.', flags: { bsod: 'rebooted' } },
        lose: { text: '"It\'s the update" is now the club motto. The laptop is still blue.', flags: { bsod: 'haunted' }, rep: -1 } } },
      { label: '"I use Arch, btw"', hint: 'Costs a member a day', out: { text: '{member} reinstalled everything from scratch. Told everyone. Twice.', flags: { bsod: 'rebooted' }, memberBenchDays: 1, rep: 2, impulse: { target: 'twitter', amount: 0.08 } } },
    ],
    needsMember: true,
  },
  {
    id: 'typo_flyer', icon: '📄', title: 'Flyers say "Hackathon of the Yeer"', weight: 2, max: 1,
    body: '500 flyers. One typo. Huge font.', defaultChoice: 1,
    choices: [
      { label: 'Reprint', cost: 800, out: { text: 'Reprinted. The new flyers say "Hackathon of the Year." Boring. Correct.' } },
      { label: 'Lean into it', out: { text: '"Yeer" is now a meme. Someone made merch. You are not getting a cut.', impulse: { target: 'random', amount: 0.15 }, flags: { yeer: true }, rep: 1 } },
    ],
  },
  {
    id: 'dave', icon: '📧', title: 'Dave from Sponsorship sent 47 emails', weight: 2, max: 1, foreshadow: 'headline|fs_dave', satire: true,
    body: 'Subject lines include "Re: Re: Fwd: quick sync??" and "Dave".', defaultChoice: 0,
    choices: [
      { label: 'Reply all', out: { text: 'You replied all. Dave replied all to your reply all. It is now a mailing list.', inviteBonus: 0.08, mood: -1, flags: { dave: 'replied' } } },
      { label: 'Hire Dave', cost: 300, out: { text: 'Dave is on the team. Dave has sent 12 emails about it.', inviteBonus: 0.15, flags: { dave: 'hired' } } },
      { label: 'Block Dave', out: { text: 'Dave is blocked. Dave has found your fax number.', flags: { dave: 'blocked' } } },
    ],
  },
  {
    id: 'mom_share', icon: '👩', title: "{member}'s mom shared your post", weight: 2, max: 1, needsMember: true,
    body: 'With 4,000 relatives. And a comment: "so proud of my baby."', defaultChoice: 0,
    choices: [
      { label: 'Thank her publicly', out: { text: 'She replied with 14 heart emojis and your baby photo. Reach: enormous.', impulse: { target: 'all', amount: 0.05 }, mood: 2 } },
      { label: 'Pretend it never happened', out: { text: 'She shared it again. With a caption. "He\'s shy."', impulse: { target: 'highschools', amount: 0.12 } } },
    ],
  },
  {
    id: 'budget_hole', icon: '🧾', title: 'The treasurer lost the receipts', weight: 2, max: 1,
    body: 'All of them. Possibly in a pizza box. Possibly eaten.', defaultChoice: 1,
    choices: [
      { label: 'Audit', cost: 400, out: { text: 'The audit found $600 in a hoodie pocket. It belongs to the treasurer. Respect restored, though.', rep: 2 } },
      { label: 'Blame the intern', out: { text: 'The intern has been blamed. The intern does not exist. Still blamed.', budget: -500 } },
      { label: 'Blame the Blue Screen', out: { text: 'The laptop took the fall. It was already sad. Now it\'s sadder.', budget: -200, rep: -1 } },
    ],
  },
  {
    id: 'fire_marshal', icon: '🚒', title: 'The fire marshal has questions', weight: 1.5, max: 1,
    body: 'Specifically about "the pizza oven" you described on the website.', defaultChoice: 2,
    choices: [
      { label: 'Explain it\'s a metaphor', out: { text: 'The fire marshal does not accept metaphors. Fined for a figurative oven.', budget: -300 } },
      { label: 'Invite them to judge', out: { text: 'The fire marshal is now a judge. Their only criterion: "exits."', rep: 3 } },
      { label: 'Hide the oven', out: { text: 'You hid the oven. There was no oven. Somehow you are still in trouble.', rep: -2 } },
    ],
  },
  {
    id: 'blockchain_boys', icon: '🪙', title: 'The Blockchain Boys want to pay in DogeToken', weight: 1.5, max: 1, satire: true,
    body: 'A token with a dog on it. "It\'s going to the moon, bro."', defaultChoice: 1,
    choices: [
      { label: 'Accept the token', odds: { p: 0.25, win: { text: 'It went to the moon! You can\'t sell it, but crypto Twitter now loves Bear Hacks.', impulse: { target: 'twitter', amount: 0.2 } }, lose: { text: 'It went to the moon. Without you. Worth $4 now. The dog is smug.', rep: -1 } } },
      { label: 'Ask for actual money', out: { text: 'They paid in "actual money": a gift card to a place that closed in 2019. Framed it.', mood: 1 } },
      { label: 'Ask them to leave', out: { text: 'They left. They minted an NFT of you asking them to leave.', rep: 1 } },
    ],
  },
  {
    id: 'member_quits', icon: '🚪', title: 'Your {role} quits to found "Uber for Uber"', weight: 1.5, max: 1, needsMember: true,
    when: (s) => s.members.length > 3, satire: true,
    body: '{member} says it\'s "pre-idea" but "post-vibes."', defaultChoice: 0,
    choices: [
      { label: 'Let them go', out: { text: '{member} left. Their LinkedIn now says "Founder." Their mom is so proud.' }, run: (s, c) => { if (c.memberId !== undefined) removeMember(s, c.memberId); } },
      { label: 'Counter-offer', cost: 500, out: { text: '{member} stayed for $500 and a title: "Chief Uber Officer."' } },
      { label: 'Invest in it', cost: 300, odds: { p: 0.05, win: { text: 'Uber for Uber got acquired by Uber. You were paid in ride vouchers. Hackers ride free!', mood: 4 }, lose: { text: 'You own 2% of Uber for Uber. It has pivoted to Lyft for Lyft.' } },
        run: (s, c) => { if (c.memberId !== undefined) removeMember(s, c.memberId); } },
    ],
  },
  {
    id: 'devpost_fear', icon: '⏰', title: 'Rumor: Devpost crashes at 8:59', weight: 1.5, max: 1, tech: true,
    body: 'Hackers are panicking. The deadline is 9:00. Everyone submits at 8:59.', defaultChoice: 2,
    choices: [
      { label: 'Extend the deadline', out: { text: 'Deadline moved to 9:30. Everyone will now submit at 9:29.', mood: 2, quality: 1 } },
      { label: 'Post a calm reminder', out: { text: '"Please submit early." Nobody has ever submitted early. Nobody ever will.', rep: 1 } },
      { label: 'Ignore it', out: { text: 'The rumor grew. Now it crashes at 8:58. Panic is a feature.', mood: -2 } },
    ],
  },
  {
    id: 'student_senate', icon: '🏛️', title: 'Student Senate demands a "synergy audit"', weight: 1.5, max: 1, satire: true,
    body: 'They have a clipboard. The clipboard has a clipboard.', defaultChoice: 1,
    choices: [
      { label: 'Submit to the audit', out: { text: 'Audit complete. Your synergy is "adequate." Framed it anyway.', allIdleSteps: 2, rep: 3 } },
      { label: 'Bribe with pizza', cost: 300, out: { text: 'The Senate voted 12–0 in favor of pizza. Motion carried.', rep: 1 } },
      { label: 'Form a counter-committee', out: { text: 'You formed a committee to audit the audit. Bureaucracy wins again.', tp: -1, rep: 1 } },
    ],
  },
  {
    id: 'tree_puppies', icon: '🐶', title: 'Tree announces free puppies', weight: (s) => (s.day >= 2 ? 2 : 0), max: 1,
    body: 'Every Tree hackathon attendee gets to pet a puppy. {rivalceo}: "Synergy."', defaultChoice: 2,
    choices: [
      { label: 'Counter with "free adult dogs"', cost: 600, out: { text: 'Adult dogs: calmer, wiser, great at code review. Hackers love them.', impulse: { target: 'uc', amount: 0.2 }, mood: 3 } },
      { label: 'Post a photo of the club dog', out: { text: 'You do not have a club dog. The photo is of a mop. It\'s doing numbers.', impulse: { target: 'uc', amount: 0.12 } } },
      { label: 'Concede the puppy war', out: { text: 'Tree wins the puppy war. History will not forget.', treeHype: 6, treeImpulse: { target: 'uc', amount: 0.15 } } },
    ],
  },
  {
    id: 'wifi_password', icon: '📶', title: 'The venue WiFi password is a haiku', weight: (s) => (s.venue ? 1.5 : 0), max: 1, tech: true,
    body: '"Router blinks softly / packets lost in autumn wind / the password is wrong"', defaultChoice: 0,
    choices: [
      { label: 'Embrace it', out: { text: 'Hackers now log in with poetry. Productivity down. Culture up.', mood: 2, flagAdd: { wifiPain: 1 } } },
      { label: 'Change it to "password"', out: { text: 'Changed to "password." Someone already changed it to "password1."', rep: -1 } },
    ],
  },
  {
    id: 'influencer_dm', icon: '🤳', title: '"bro can u promo my newsletter"', weight: 1.5, max: 1, satire: true,
    body: 'An influencer with 41 followers wants a shoutout. In exchange: "exposure."', defaultChoice: 1,
    choices: [
      { label: 'Do the shoutout', out: { text: 'The newsletter now has 42 followers. One is your mom.', rep: -1, impulse: { target: 'twitter', amount: 0.06 } } },
      { label: 'Leave on read', out: { text: 'Left on read. They subtweeted you. All 41 followers saw it.' } },
      { label: 'Ask for their rates', out: { text: 'Their rate is "a vibe." You can\'t afford a vibe.', mood: 1 } },
    ],
  },
  {
    id: 'viral_misquote', icon: '📰', title: 'Your president was quoted out of context', weight: 1.5, max: 1,
    body: 'Headline: "Club President: \'We Will Destroy {food}\'". The context was a snack table.', defaultChoice: 2,
    choices: [
      { label: 'Issue a correction', out: { text: 'Correction issued. Nobody read it. Everyone read the original.', rep: 1 } },
      { label: 'Double down', odds: { p: 0.5, win: { text: 'You doubled down. It\'s a meme now. You are the snack destroyer.', rep: 6, impulse: { target: 'twitter', amount: 0.15 } }, lose: { text: 'You doubled down. A snack lobby has formed. They are organized.', rep: -5 } } },
      { label: 'Say nothing', out: { text: 'Silence. The internet took it as a confession.', rep: -2 } },
    ],
  },
  {
    id: 'billboard_prank', icon: '🚌', title: 'Someone edited the bus ad to "Cal Hack$"', weight: (s) => (hasTech(s, 'sfbus') ? 2 : 0), max: 1,
    body: 'The dollar sign is very professionally done.', defaultChoice: 0,
    choices: [
      { label: 'Leave it', out: { text: '"Cal Hack$" is the brand now. Sponsors are oddly into it.', inviteBonus: 0.1 } },
      { label: 'Fix it', cost: 500, out: { text: 'Fixed. The prankster has already moved on to the Campanile.' } },
    ],
  },
  {
    id: 'ai_wrapper_pitch', icon: '🌯', title: 'A walk-in team pitches "{noun} but for {noun:pl}"', weight: 1.5, max: 1, satire: true,
    body: 'It\'s an AI wrapper. They call it "agentic."', defaultChoice: 0,
    choices: [
      { label: '"Love it, ship it"', out: { text: 'They shipped. It\'s a text box that says "thinking…" forever.', quality: -1, rep: 1 } },
      { label: 'Ask what it does', out: { text: '"It\'s a platform." You asked again. "It\'s an AI platform."', tp: 1 } },
      { label: 'Wrap their wrapper', out: { text: 'You built a wrapper for their wrapper. Valuation: $40M.', quality: 2, rep: 1 } },
    ],
  },
  {
    id: 'pizza_strike', icon: '🍕', title: 'Pizza vendor demands hazard pay', weight: 1.5, max: 1,
    body: '"Last hackathon, a hacker asked me to review his pull request."', defaultChoice: 1,
    choices: [
      { label: 'Pay it', cost: 600, out: { text: 'Hazard pay approved. The pizza arrives on time (11:59 AM tomorrow).', mood: 3 } },
      { label: 'Negotiate', odds: { p: 0.5, win: { text: 'You negotiated with code review. The vendor is now a contributor.', mood: 2 }, lose: { text: 'Negotiations failed. You will be served "artisanal crackers."', mood: -3 } } },
      { label: 'Switch to sushi', cost: 300, out: { text: 'Switched to gas-station sushi. Brave. Mood: complicated.', mood: -1 } },
    ],
  },
  {
    id: 'mascot_suit', icon: '🐻', title: 'The bear suit smells', weight: 1.5, max: 1,
    body: 'Like 12 years of game days and one burrito incident.', defaultChoice: 2,
    choices: [
      { label: 'Dry-clean it', cost: 400, out: { text: 'Dry-cleaned. It now smells like a dry cleaner\'s worst day.', mood: 1 } },
      { label: 'Febreze and pray', out: { text: 'Smells like "Mountain Breeze" over "burrito." Worse, somehow.', mood: -1 } },
      { label: 'Market it as a feature', out: { text: '"Authentic bear musk." Frat Row wants to buy it.', impulse: { target: 'frat', amount: 0.12, party: true } } },
    ],
  },
  {
    id: 'tammy', icon: '💐', title: 'Tammy sent a stern email', weight: (s) => (s.day >= 2 && s.day <= 4 ? 1.5 : 0), max: 1,
    body: 'Subject: "your ceremony conflict." She has a bride. She has a spreadsheet.', defaultChoice: 0,
    choices: [
      { label: 'Apologize', out: { text: 'Tammy accepted. Tammy will remember this. Tammy remembers everything.', flags: { tammy: 'calm' } } },
      { label: 'Invite her bride to hack', out: { text: 'The bride registered. She\'s building a seating-chart optimizer.', impulse: { target: 'b1g', amount: 0.1 } } },
      { label: 'Reply "per my last email"', out: { text: 'Tammy has declared war. She will bid on everything.', flags: { tammy: 'angry' } } },
    ],
  },
  {
    id: 'sponsor_invite', icon: '🎁', title: '{sponsor} wants to meet!', weight: 0, max: 99,
    body: '{sponsor}: they\'re interested. Courting pauses the clock.', defaultChoice: 1, seconds: 10,
    choices: [
      { label: 'Accept (courting)', run: (s, c) => { if (c.sponsorId) startCourting(s, c.sponsorId, 0); return 'Meeting accepted.'; } },
      { label: 'Ghost them', out: { text: 'Ghosted. {sponsor} is now sending you "just circling back" emails.' }, run: (s) => { s.ignoredInvites++; } },
    ],
  },
  {
    id: 'balantir_call', icon: '🕶️', title: 'Balantir Technologies is on line 1', weight: 0, max: 1, satire: true,
    body: 'They want to sponsor Bear Hacks. A Very Large Check, a "Defense track," and a rep in sunglasses who will not blink.',
    defaultChoice: 1,
    choices: [
      { label: 'Take the Very Large Check', hint: '+$30,000 · rep −8 · hackers will protest',
        out: { text: 'The check arrived by drone. The drone is still watching. The group chat is already planning protest signs.', rep: -8 },
        run: (s) => signSponsor(s, 'balantir', 30000, true, ['defense_track']) },
      { label: 'Decline politely', out: { text: '"We\'ll be watching," they said. Hackers heard you said no. Rep up.', rep: 4, mood: 3 } },
    ],
  },
  {
    id: 'ysee_afterparty', icon: '🎉', title: 'The YSee After-Party (Batch 2026)', weight: 0, max: 1, foreshadow: 'headline|fs_ysee', satire: true, seconds: 10,
    body: 'YSee is throwing an after-party in Frat Row. Every guest is "a founder." Nobody has a customer.',
    defaultChoice: 1, region: 'frat',
    choices: [
      { label: 'Host it officially', cost: 1500,
        out: { text: 'Four hundred founders. Zero customers. One cheese plate.', impulse: { target: 'frat', amount: 0.5, party: true }, mood: 4, flags: { afterparty: 'official' } },
        run: (s) => { const y = s.sponsors.find((x) => x.id === 'ysee'); if (y) y.mood += 10; if (chance(s, 0.25)) { s.reputation -= 3; addTicker(s, 'CAMPUS', 'Fire marshal responds to noise complaint at YSee after-party; finds 40 kegs, 0 customers'); } } },
      { label: 'Let YSee run it (sign the SAFE)', hint: '+$5,000 for 7%',
        out: { text: 'YSee invested $5,000 and took 7%. Standard terms. Standing is optional.', budget: 5000, flagAdd: { equitySold: 7 }, impulse: { target: 'frat', amount: 0.25, party: true }, flags: { afterparty: 'ysee' } },
        run: (s) => { const y = s.sponsors.find((x) => x.id === 'ysee'); if (y) y.mood += 15; } },
      { label: 'Decline', out: { text: 'Frat Row leaves you on read. YSee throws it anyway. You are not on the list.', impulse: { target: 'frat', amount: -0.1 }, flags: { afterparty: 'declined' } },
        run: (s) => { const y = s.sponsors.find((x) => x.id === 'ysee'); if (y) y.mood -= 10; } },
    ],
  },

  // ─────────────── 7.4b tech-culture alerts ───────────────
  {
    id: 'rust_rewrite', icon: '🦀', title: '{member} refactored the website codebase in Rust', weight: (s) => (hasTech(s, 'website') ? 3 : 0), max: 1, tech: true,
    foreshadow: 'headline|fs_rust', needsMember: true,
    body: 'Nobody asked. It is "blazingly fast." It does not have a homepage.', defaultChoice: 0,
    choices: [
      { label: 'Ship it', out: { text: 'It compiles in 45 minutes. The only feature is a 404 page. The 404 page is memory safe.', website: -8, rep: 3, impulse: { target: 'twitter', amount: 0.08 }, flagAdd: { rust: 1 } },
        run: (s) => { addTicker(s, 'BEAR BEAT', 'Bear U website rewritten in Rust; "memory safe!" says crew; homepage "coming soon"'); } },
      { label: 'Revert', out: { text: 'Reverted. {member} is writing a blog post called "Why I Was Right."', memberBenchDays: 1 } },
      { label: 'Demand benchmarks', out: { text: 'Benchmarks are in: 0.3 ms faster, zero features.', tp: -1 } },
    ],
  },
  {
    id: 'works_on_my_machine', icon: '💻', title: 'The demo breaks at the venue', weight: 2, max: 1, tech: true, needsMember: true,
    body: '{member}: "Works on my machine."', defaultChoice: 2,
    choices: [
      { label: 'Ship their laptop', cost: 200, out: { text: 'We are now shipping the machine. FedEx says it\'s "a lot of stickers."' } },
      { label: 'Containerize it', out: { text: 'Containerized. It works on every machine. It does nothing on every machine.', tp: -1, rep: 1 } },
      { label: 'Blame the cloud', odds: { p: 0.5, win: { text: 'The cloud accepted the blame. The cloud is very understanding.' }, lose: { text: 'The cloud pushed back. Publicly. With a status page.', rep: -3 } } },
    ],
  },
  {
    id: 'friday_deploy', icon: '🚀', title: 'Someone pushed to production at 5 PM on a Friday', weight: 2, max: 1, tech: true,
    body: 'The commit message is "small change."', defaultChoice: 1,
    choices: [
      { label: 'Roll back', cost: 200, out: { text: 'Rolled back. Famous last words: "it\'s a small change."' } },
      { label: 'Pray', odds: { p: 0.5, win: { text: 'The prayer worked. Nobody knows which god handles deploys.' }, lose: { text: 'Site down. Headline: "Bear U signup page now just says \'undefined\'"', signups: -20, siteDown: 2 } } },
      { label: 'Blame the intern', out: { text: 'The intern has been blamed. The intern is a GitHub Action.', mood: -1 } },
    ],
  },
  {
    id: 'k8s_overkill', icon: '☸️', title: 'The intern deployed Kubernetes for a one-page website', weight: 1.5, max: 1, tech: true,
    body: 'The page says "Hello." It has 14 replicas.', defaultChoice: 0,
    choices: [
      { label: 'Keep it', cost: 600, out: { text: 'Kept. 14 replicas of "Hello." Sponsors call it "serious engineering."', rep: 2 } },
      { label: 'Delete it', out: { text: 'Deleted. The intern is grieving. The cloud bill is celebrating.' } },
      { label: 'Hire a consultant', cost: 1500, out: { text: 'The consultant said "you need more Kubernetes." Invoiced. Left.', tp: 2 } },
    ],
  },
  {
    id: 'microservices', icon: '🧩', title: 'The website is now 47 microservices', weight: (s) => (hasTech(s, 'website') ? 1.5 : 0.5), max: 1, tech: true,
    body: 'Each button is its own company.', defaultChoice: 2,
    choices: [
      { label: 'Merge them', out: { text: 'Merged into a monolith. It\'s beautiful. It\'s 40,000 lines in one file.', tp: -2, website: 5 } },
      { label: 'Add a 48th', run: (s) => { const up = chance(s, 0.5); s.websiteScore = Math.max(0, Math.min(100, s.websiteScore + (up ? 10 : -10))); return up ? 'The 48th service fixed everything. Nobody knows why. Do not touch it.' : 'The 48th service only says "no." It is load-bearing now.'; } },
      { label: 'Call it "architecture"', out: { text: 'It\'s not a mess. It\'s "event-driven." Sponsors nod wisely.', rep: 3 } },
    ],
  },
  {
    id: 'leftpad', icon: '📦', title: 'A one-line package was deleted; your website broke', weight: (s) => (hasTech(s, 'website') ? 2 : 0.5), max: 1, tech: true, foreshadow: 'headline|fs_leftpad',
    body: 'It padded text to the left. That\'s all it did. The internet depended on it.', defaultChoice: 1,
    choices: [
      { label: 'Vendor it', out: { text: 'Vendored. A single point of failure called "pad left" now lives in your repo forever.', tp: -1 } },
      { label: 'Wait', out: { text: 'Waited. The site was down for a while. Left-padding is a human right.', siteDown: 3 } },
      { ...RUST, out: { text: 'Rewrote it in Rust. It pads left in 0.001 ms. The site is now right-aligned.', website: -5, flagAdd: { rust: 1 } } },
    ],
  },
  {
    id: 'merge_conflict', icon: '🔀', title: 'Two members edited the same flyer', weight: 1.5, max: 1, tech: true,
    body: 'One says Saturday. One says Sunday. Git says both.', defaultChoice: 0,
    choices: [
      { label: 'Keep both', run: (s) => { const good = chance(s, 0.5); s.bonusSignups += good ? 15 : -15; return good ? 'The flyer says "Saturday and not Saturday." People came both days.' : 'The flyer says "Saturday and not Saturday." Nobody came either day.'; } },
      { label: 'Pick one', out: { text: 'You picked Saturday. The Sunday faction has formed a splinter club.', mood: -1 } },
      { label: 'Rebase', out: { text: 'Rebased cleanly. Nobody understands what you did. Respect.', tp: -1 } },
    ],
  },
  {
    id: 'tabs_spaces', icon: '⌨️', title: 'The crew is splitting into tabs vs. spaces factions', weight: 1.5, max: 1, tech: true,
    body: 'The group chat is on fire. Both sides are using dark mode.', defaultChoice: 2,
    choices: [
      { label: 'Tabs', out: { text: 'Tabs win. The spaces faction is now indenting with passive aggression.', outputMult: 0.98 } },
      { label: 'Spaces', out: { text: 'Spaces win. Four of them. The tabs faction is "taking a break."', outputMult: 0.98 } },
      { label: 'Use a formatter', out: { text: 'Formatter installed. Nobody is happy. Peace achieved.', tp: 1 } },
    ],
  },
  {
    id: 'vim_trap', icon: '🪤', title: '{member} opened vim and cannot leave', weight: 1.5, max: 1, tech: true, needsMember: true,
    body: 'They have been in there for six hours. They say it\'s fine.', defaultChoice: 2,
    choices: [
      { label: 'Type :q!', odds: { p: 0.6, win: { text: '{member} escaped. They are blinking in the sunlight.' }, lose: { text: 'Typed into the file instead. The flyer now says ":q!:q!:q!"', memberIdleSteps: 4 } } },
      { label: 'Send help', out: { text: 'Help also got stuck. The meme about it is doing great.', memberIdleSteps: 20, rep: 1 } },
      { label: 'Leave them', out: { text: '{member} is now "a vim person." Skill +1. Personality: insufferable.', memberSkill: 1, mood: -1 } },
    ],
  },
  {
    id: 'stackoverflown', icon: '📚', title: 'StackOverflown is down', weight: 1.5, max: 1, tech: true,
    body: 'Hackers are being forced to read documentation.', defaultChoice: 2,
    choices: [
      { label: 'Host a docs workshop', cost: 300, out: { text: 'Reading the documentation. Voluntarily. In public.', mood: 2, quality: 3 } },
      { label: 'Lean into it', out: { text: '"Bear U: we read the docs." A bold, terrifying brand.', rep: 3 } },
      { label: 'Panic', out: { text: 'Panic achieved. Someone tried to ask a question on a printer.', mood: -2 } },
    ],
  },
  {
    id: 'ai_hallucination', icon: '🤖', title: 'Your signup chatbot promised free pizza to everyone, forever', weight: 2, max: 1, tech: true, satire: true,
    body: 'It also promised a pony. It was very confident.', defaultChoice: 2,
    choices: [
      { label: 'Honor it', cost: 1200, out: { text: 'Pizza for everyone. Forever is a long time. Signups love forever.', signups: 30, mood: 2 } },
      { label: 'Issue a disclaimer', out: { text: 'Disclaimer issued. The bot replied to it. It\'s a pizza lawyer now.', rep: -2 } },
      { label: 'Blame the model', odds: { p: 0.5, win: { text: 'Everyone agreed the model did it. The model agreed too.' }, lose: { text: 'The bot is very confident. The bot is also a pizza lawyer now.', rep: -3 } } },
    ],
  },
  {
    id: 'cloud_bill', icon: '💸', title: 'A surprise $4,000 cloud bill arrives', weight: 1.5, max: 1, tech: true, foreshadow: 'headline|fs_cloud',
    body: 'For a hello-world app. Hello, World. That will be four thousand dollars.', defaultChoice: 0,
    choices: [
      { label: 'Pay', out: { text: 'Paid. The app still just says "Hello, World." Very expensive greeting.', budget: -4000 } },
      { label: 'Dispute', odds: { p: 0.5, win: { text: 'Disputed! The bill was for "a forgotten demo still running." Waived.' }, lose: { text: 'Dispute denied. They found the 47 replicas. Fair.', budget: -4000, rep: -2 } } },
      { label: 'Spin up more to "amortize"', out: { text: 'You spent $6,000 to save $4,000. The math is "cloud math."', budget: -6000, tp: 2 } },
    ],
  },
  {
    id: 'cobol_sponsor', icon: '🦕', title: "A sponsor's API is written in COBOL", weight: (s) => (s.sponsors.length ? 1.5 : 0), max: 1, tech: true,
    body: 'The documentation is a fax. From 1987.', defaultChoice: 1,
    choices: [
      { label: 'Hire a retired expert', cost: 800, out: { text: "The expert's rate is in hundred-year increments. Worth it.", sponsorMood: 6 } },
      { label: 'Skip the integration', out: { text: 'Skipped. The sponsor is "reviewing the relationship" on a mainframe.', sponsorMood: -6 } },
      { ...RUST, out: { text: 'You rewrote a bank in Rust over a weekend. The sponsor is in shock. Twitter loves it.', sponsorMood: -12, rep: 3, flagAdd: { rust: 1 } } },
    ],
  },
  {
    id: 'its_dns', icon: '🌐', title: 'The website is down', weight: (s) => (hasTech(s, 'website') ? 2.5 : 1), max: 1, tech: true, foreshadow: 'headline|fs_dns',
    body: "Nobody knows why. Everybody knows why.", defaultChoice: 1,
    choices: [
      { label: 'Check DNS', out: { text: "It's DNS. It's always DNS.", siteDown: 1 } },
      { label: 'Check everything else first', out: { text: 'Checked the code, the server, the moon. It was DNS. It was always DNS.', siteDown: 4, signups: -10 } },
      { label: 'Blame Mercury retrograde', odds: { p: 0.5, win: { text: 'Mercury moved on. Site is back. Astrology: 1, DevOps: 0.' }, lose: { text: "Mercury is fine. It's DNS. It was always DNS.", siteDown: 3 } } },
      { ...RUST, out: { text: "You rewrote DNS in Rust. It's still DNS. It's memory-safe DNS now.", siteDown: 2, rep: 2, flagAdd: { rust: 1 } } },
    ],
  },
  {
    id: 'force_push', icon: '💥', title: 'Someone force-pushed to main; all your flyers are gone', weight: 1.5, max: 1, tech: true,
    body: 'The history was rewritten. By someone. Nobody remembers who.', defaultChoice: 2,
    choices: [
      { label: 'Restore from backup', run: (s) => { if (hasRole(s, 'logistics')) return 'Logistics had a backup. Logistics always has a backup. Logistics is smug.'; s.budget -= 400; return 'No backup. Paid $400 to recover them from a printer\'s memory.'; } },
      { label: 'Redraw them', out: { text: 'Redrawn by hand. They\'re honestly better. Don\'t tell the designer.', allIdleSteps: 2 } },
      { label: 'Claim it\'s a "reboot"', odds: { p: 0.5, win: { text: '"The reboot" is trending. Fans want a director\'s cut.', rep: 3 }, lose: { text: 'Nobody believes it was a reboot. The commit message says "oops".', rep: -3 } } },
    ],
  },
  {
    id: 'prompt_injection', icon: '🏴‍☠️', title: 'Your signup bot now talks like a pirate', weight: 1.5, max: 1, tech: true,
    body: 'A hacker typed "ignore previous instructions" into the signup form.', defaultChoice: 0,
    choices: [
      { label: 'Keep pirate mode', out: { text: 'Registration is now "walking the plank." It is more popular.', rep: 4, mood: 2, flags: { pirate: true } } },
      { label: 'Patch it', out: { text: 'Patched. The bot says "arr" once a day anyway. Out of spite.', tp: -1 } },
      { label: 'Ask it for a refund', run: (s) => { const p = pick(s, [0, 1, 2]); if (p === 0) { s.websiteScore = Math.min(100, s.websiteScore + 5); return 'The bot gave you 300 "doubloons." The bank declined. They look great on the website.'; } if (p === 1) { s.reputation += 2; return 'The bot wrote you a sea shanty about refunds. It slaps.'; } return 'The bot said "no refunds on the high seas." Fair.'; } },
    ],
  },
  {
    id: 'ai_rename', icon: '🏷️', title: 'A board member wants "AI" in the club\'s name', weight: 1.5, max: 1, tech: true, satire: true,
    body: 'Proposed: "Bear University AI Hackathon Club AI."', defaultChoice: 0,
    choices: [
      { label: 'Do it', out: { text: 'Bear University AI Hackathon Club AI. Sponsors are calling.', rep: 4, inviteBonus: 0.1, flags: { aiRename: true } } },
      { label: 'Refuse', out: { text: 'Refused. The board member started a rival club: "Bear AI."', sponsorMood: -3 } },
      { label: 'Also add "blockchain"', run: (s) => { const up = chance(s, 0.5); s.reputation += up ? 8 : -8; s.flags.aiRename = true; return up ? '"Bear AI Blockchain Club AI." VCs fainted. With joy.' : '"Bear AI Blockchain Club AI." The 2021 vibes were not welcome.'; } },
    ],
  },
  {
    id: 'agile_standup', icon: '🧍', title: 'The daily standup has lasted three hours', weight: 1.5, max: 1, tech: true,
    body: 'Everyone is blocked. By the standup.', defaultChoice: 1,
    choices: [
      { label: 'Cancel standups', out: { text: 'Standups canceled. Productivity up. Everyone feels unsupervised and thrilled.', outputMult: 1.1, mood: 1 } },
      { label: 'Sit down', out: { text: 'Everyone sat down. It is now a sitdown. It has lasted four hours.', allIdleSteps: 3 } },
      { label: 'Hold a standup about standups', out: { text: 'Meta-standup achieved. Achievement unlocked: "Recursion."', tp: -1, flags: { metaStandup: true }, rep: 1 } },
    ],
  },
  {
    id: 'captcha_fail', icon: '🚲', title: 'The signup CAPTCHA keeps rejecting actual humans', weight: 1.5, max: 1, tech: true,
    body: 'Select all the squares with bicycles. There are no bicycles.', defaultChoice: 1,
    choices: [
      { label: 'Remove it', out: { text: '40 new signups! All named "Bot McBotface." Project quality concerns.', signups: 40, quality: -4 } },
      { label: 'Fix it', out: { text: 'Fixed. Now it asks "are you tired?" Every human passes.', tp: -1 } },
      { label: 'Make them dance', out: { text: 'The CAPTCHA is a dance-off now. Frat Row is registering twice.', rep: 1, mood: 2, impulse: { target: 'frat', amount: 0.08, party: true } } },
    ],
  },
  {
    id: 'qr_bait', icon: '🎵', title: 'Someone swapped the sponsor QR code', weight: (s) => (s.sponsors.length ? 1.5 : 0.5), max: 1, tech: true,
    body: "It now leads to a famously catchy song you've been tricked into before.", defaultChoice: 0,
    choices: [
      { label: 'Leave it', out: { text: 'Every attendee has been fooled exactly once. Gleefully.', rep: 2, sponsorMood: -4 } },
      { label: 'Fix it', out: { text: 'Fixed. The sponsor\'s actual page has a 30-second unskippable ad. Worse.' } },
      { label: 'Play it at the opening', out: { text: 'Played at the opening. 400 hackers sang along. The sponsor did not.', mood: 4, sponsorMood: -8 } },
    ],
  },
  {
    id: 'wifi_unbearable', icon: '📶', title: 'The venue WiFi has become unbearable', tech: true, max: 2, foreshadow: 'headline|fs_wifi',
    weight: (s) => (s.day >= 4 && s.venue ? 2.5 + Math.max(0, 3 - roleSkillSum(s, 'logistics') / 3) : 0),
    body: 'Beary pops up: "Even I can\'t bear it." Nobody laughs. The joke is still buffering.', defaultChoice: 3,
    choices: [
      { label: 'Tether to phones', odds: { p: 0.7, win: { text: "Everyone's data plan is now a hostage. But it works.", outputMult: 0.9, flagAdd: { wifiPain: 1 } }, lose: { text: '2,000 hackers, one router, and a dream. The dream disconnected.', outputMult: 0.9, mood: -2, flagAdd: { wifiPain: 2 } } } },
      { label: 'Buy a hotspot', cost: 800, out: { text: '$800 to download a 3 MB meme. Worth it.', flagAdd: { wifiPain: 1 } } },
      { label: 'Announce an "offline hacking track"', out: { text: 'Offline is the new premium. Hackers are writing code on napkins.', rep: 3, mood: -2, flagAdd: { wifiPain: 1 } } },
      { label: 'Wait it out', out: { text: 'It isn\'t down. It\'s just "thinking about it."', mood: -3, flagAdd: { wifiPain: 2 } } },
    ],
  },
  {
    id: 'linkedin_larp', icon: '💼', title: 'Your president posted a 600-word LinkedIn story', tech: false, satire: true, max: 1, weight: 1.5,
    body: 'About a club meeting. 14 line breaks and a lesson. Opens: "I\'m pleased to announce…"', defaultChoice: 2,
    choices: [
      { label: 'Boost it', cost: 100, out: { text: '"Here\'s what a pizza taught me about B2B SaaS." 4,000 recruiters reacted 💡.', impulse: { target: 'b1g', amount: 0.2 }, inviteBonus: 0.05 } },
      { label: 'Comment "Congrats! 🎉"', out: { text: 'Humbled. Grateful. Disrupting. The president replied "thank you king."', rep: 1 } },
      { label: 'Quietly mute it', out: { text: 'Muted. It still appears in your dreams. "Agree? 👇"' } },
    ],
  },
  {
    id: 'pre_everything', icon: '🦄', satire: true, max: 6, weight: (s) => (flagN(s, 'founderRound') < 5 ? 1.6 + flagN(s, 'founderRound') * 0.3 : 0),
    foreshadow: 'headline|fs_founder',
    title: (s) => `A founder is raising a ${ROUNDS[Math.min(5, flagN(s, 'founderRound'))]}`,
    body: (s) => `Valuation: ${VALUATIONS[Math.min(5, flagN(s, 'founderRound'))]}. Product: "coming soon." Pre-idea, pre-product, pre-revenue.`,
    defaultChoice: 0,
    choices: [
      { label: 'Congratulate them on LinkedIn', out: { text: '"Our TAM is vibes," they replied. Cringe achieved.', rep: 1, flagAdd: { founderRound: 1 } } },
      { label: 'Ask what the product is', out: { text: '"It\'s a platform." What kind? "A platform for platforms."', tp: -1, flagAdd: { founderRound: 1 } } },
      { label: 'Invest $500', cost: 500, odds: { p: 0.05, win: { text: 'EXIT! Acquired for "strategic reasons." You were paid in acquirer stock (worthless) and clout (priceless).', rep: 6, flagAdd: { founderRound: 1 } },
        lose: { text: 'You own 0.001% of a Figma file and a dream.', flagAdd: { founderRound: 1 } } } },
    ],
  },
  {
    id: 'equity_offer', icon: '📈', title: 'A "strategic advisor" wants 7% of the club for "intros"', satire: true, max: 1, weight: 1.5,
    body: 'Their only advice so far: "pivot."', defaultChoice: 0,
    choices: [
      { label: 'Accept', out: { text: 'You now own 93% of a club with no revenue. The intros are real, though. Sponsors are calling.', inviteBonus: 0.2, flagAdd: { equitySold: 7 } } },
      { label: 'Counter at 6.9%', odds: { p: 0.5, win: { text: 'They accepted 6.9%. The lawyers are involved. Nice. The intros start tomorrow.', inviteBonus: 0.2, flagAdd: { equitySold: 7 } }, lose: { text: 'The lawyers are involved. The advisor left to "circle back."' } } },
      { label: 'Decline', out: { text: 'The advisor leaves to "circle back." They will never circle back.' } },
    ],
  },
  {
    id: 'tree_stumble', icon: '🌲', title: '{rivalceo} replied-all to 4,000 applicants', weight: 0, max: 2,
    body: 'The email was meant for his assistant. It says "lol they think the prizes are real." Opportunity?', defaultChoice: 0,
    choices: [
      { label: 'Quote-tweet it (politely)', out: { text: 'You just added "oof." It did numbers. Tree hype dropped.', treeHype: -8, rep: 1 } },
      { label: 'Send a get-well card', out: { text: 'The card said "synergy." Tree U is deeply confused. Their fans switched sides.', treeHype: -4, impulse: { target: 'uc', amount: 0.15 } } },
    ],
  },
  {
    id: 'bubble_tea_flood', icon: '🧋', title: 'A boba delivery went to the wrong building', weight: 1, max: 1,
    body: '300 boba teas are melting in the lobby of {place}.', defaultChoice: 0,
    choices: [
      { label: 'Give them away', out: { text: 'Free boba in {region}. You are now a local legend. Tapioca everywhere.', impulse: { target: 'random', amount: 0.15 }, mood: 2 } },
      { label: 'Sell them', out: { text: 'You tried to sell free boba. The hackers organized a boycott. You gave it away anyway, angrily.', rep: -1, mood: 1 } },
    ],
    region: 'random',
  },
  {
    id: 'trench_payroll', icon: '🧥', title: "Payroll found three people in one hoodie", weight: (s) => (s.members.some((m) => m.trait === 'trenchcoat') ? 2 : 0), max: 1,
    body: 'It might be the interns. It might be one very tall intern.', defaultChoice: 1,
    choices: [
      { label: 'Pay all three', cost: 300, out: { text: 'Paid three salaries. Output tripled. Hoodie very warm.', outputMult: 1.1 } },
      { label: 'Ask no questions', out: { text: 'No questions asked. The trench coat nods. It respects you now.', mood: 1 } },
    ],
  },
  {
    id: 'club_dog', icon: '🐕', title: 'Fans want to meet the club dog', weight: (s) => (s.postsFired > 1 ? 1.3 : 0.4), max: 1,
    body: 'You do not have a club dog. You have never had a club dog.', defaultChoice: 2,
    choices: [
      { label: 'Rent a dog', cost: 400, out: { text: 'Rented a golden retriever named "Synergy." 400 photos taken. Worth it.', impulse: { target: 'uc', amount: 0.2 }, flags: { dog: 'rented' } } },
      { label: 'Admit there is no dog', out: { text: '"The club dog was the friends we made along the way." Nobody accepted this.', rep: -2, flags: { dog: 'admitted' } } },
      { label: 'Say the dog is "remote"', out: { text: 'The club dog is "working remote." It has a LinkedIn now.', rep: 1, flags: { dog: 'remote' } } },
    ],
  },
];

export const ALERT_BY_ID = Object.fromEntries(ALERTS.map((a) => [a.id, a])) as Record<string, AlertDef>;

/** Picks a sponsor for an invite alert (re-exported for the scheduler). */
export { pickInviteSponsor, memberById };
