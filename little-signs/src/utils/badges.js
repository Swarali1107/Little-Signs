// ── Badge definitions ─────────────────────────────────────────────────────────
export const BADGES = {
  // Alphabet badges
  first_sign:      { id:'first_sign',      emoji:'🌟', name:'First Sign!',         desc:'Detected your first ISL letter' },
  streak_3:        { id:'streak_3',        emoji:'⚡', name:'On a Roll!',           desc:'3 correct signs in a row' },
  streak_5:        { id:'streak_5',        emoji:'🔥', name:'On Fire!',             desc:'5 correct signs in a row' },
  streak_10:       { id:'streak_10',       emoji:'💥', name:'Unstoppable!',         desc:'10 correct signs in a row' },
  vowels_master:   { id:'vowels_master',   emoji:'🅰️', name:'Vowel Master',         desc:'Mastered all 5 vowels A E I O U' },
  half_alphabet:   { id:'half_alphabet',   emoji:'📖', name:'Halfway There!',       desc:'Mastered 13 or more letters' },
  full_alphabet:   { id:'full_alphabet',   emoji:'🏆', name:'Alphabet Champion!',   desc:'Mastered all 26 ISL letters' },

  // Number badges
  first_number:    { id:'first_number',    emoji:'🔢', name:'First Number!',        desc:'Detected your first ISL number sign' },
  number_streak:   { id:'number_streak',   emoji:'🎯', name:'Number Streak!',       desc:'3 correct number signs in a row' },
  all_numbers:     { id:'all_numbers',     emoji:'💯', name:'Count Master!',        desc:'Successfully signed all numbers 0-9' },

  // Dictionary badges
  word_explorer:   { id:'word_explorer',   emoji:'🔍', name:'Word Explorer',        desc:'Watched your first ISL word video' },
  word_collector:  { id:'word_collector',  emoji:'📚', name:'Word Collector',       desc:'Explored 10 words in the dictionary' },
  word_master:     { id:'word_master',     emoji:'🌐', name:'Word Master',          desc:'Explored 50 words in the dictionary' },

  // Sentence badges
  first_sentence:  { id:'first_sentence',  emoji:'✍️', name:'First Sentence!',      desc:'Built your first sentence' },
  long_sentence:   { id:'long_sentence',   emoji:'📝', name:'Storyteller',          desc:'Built a sentence with 10+ letters' },

  // General badges
  daily_streak_3:  { id:'daily_streak_3',  emoji:'📅', name:'3-Day Streak!',        desc:'Practiced 3 days in a row' },
  daily_streak_7:  { id:'daily_streak_7',  emoji:'🗓️', name:'Weekly Warrior!',      desc:'Practiced 7 days in a row' },
  early_bird:      { id:'early_bird',      emoji:'🌅', name:'Early Bird',           desc:'Practiced before 9 AM' },
};

// ── Award a badge (checks if already earned, saves to backend) ────────────────
export const awardBadge = async (badgeId, user, authFetch, showBadgeCallback) => {
  if (!user || !authFetch) return;
  const badge = BADGES[badgeId];
  if (!badge) return;

  // Check localStorage to avoid duplicate popups in same session
  const earned = JSON.parse(localStorage.getItem('ls_earned_badges') || '[]');
  if (earned.includes(badgeId)) return;

  try {
    const res  = await authFetch('/learner/badge', {
      method: 'POST',
      body: JSON.stringify({ badge_id: badgeId }),
    });
    const data = await res.json();

    // Only show popup if newly awarded (not already in DB)
    if (data.newly_awarded !== false) {
      earned.push(badgeId);
      localStorage.setItem('ls_earned_badges', JSON.stringify(earned));
      if (showBadgeCallback) showBadgeCallback(badge);
    }
  } catch {
    // Even if API fails, show locally if not shown before
    earned.push(badgeId);
    localStorage.setItem('ls_earned_badges', JSON.stringify(earned));
    if (showBadgeCallback) showBadgeCallback(badge);
  }
};

// ── Check and award multiple badges at once ───────────────────────────────────
export const checkAndAwardBadges = async (stats, user, authFetch, showBadgeCallback) => {
  if (!user || !authFetch) return;

  const { correctStreak, masteredLetters = [], masteredNumbers = [], wordsWatched = 0, streak = 0 } = stats;

  // Streak badges
  if (correctStreak >= 3)  await awardBadge('streak_3',       user, authFetch, showBadgeCallback);
  if (correctStreak >= 5)  await awardBadge('streak_5',       user, authFetch, showBadgeCallback);
  if (correctStreak >= 10) await awardBadge('streak_10',      user, authFetch, showBadgeCallback);

  // Alphabet badges
  const vowelsMastered = ['A','E','I','O','U'].every(v => masteredLetters.includes(v));
  if (vowelsMastered)                       await awardBadge('vowels_master', user, authFetch, showBadgeCallback);
  if (masteredLetters.length >= 13)         await awardBadge('half_alphabet', user, authFetch, showBadgeCallback);
  if (masteredLetters.length >= 26)         await awardBadge('full_alphabet', user, authFetch, showBadgeCallback);

  // Number badges
  if (masteredNumbers.length >= 10)         await awardBadge('all_numbers',   user, authFetch, showBadgeCallback);

  // Dictionary badges
  if (wordsWatched >= 1)                    await awardBadge('word_explorer',  user, authFetch, showBadgeCallback);
  if (wordsWatched >= 10)                   await awardBadge('word_collector', user, authFetch, showBadgeCallback);
  if (wordsWatched >= 50)                   await awardBadge('word_master',    user, authFetch, showBadgeCallback);

  // Daily streak
  if (streak >= 3)                          await awardBadge('daily_streak_3', user, authFetch, showBadgeCallback);
  if (streak >= 7)                          await awardBadge('daily_streak_7', user, authFetch, showBadgeCallback);
};
