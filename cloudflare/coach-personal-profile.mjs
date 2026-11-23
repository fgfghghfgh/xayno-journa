export const COACH_PERSONAL_PROFILE_ID = 'coach_personal_profile';

export const COACH_PERSONAL_PROFILE_QUESTIONS = [
  { key: 'motivation', title: 'چرا ترید می‌کنی؟', prompt: 'چی شد که ترید را شروع کردی و الان مهم‌ترین دلیل ادامه‌دادنت چیست؟' },
  { key: 'goals', title: 'هدف‌ها', prompt: 'در یک سال آینده دوست داری در ترید و زندگی‌ات به چه چیزی برسی؟ موفقیت برای خودت یعنی چه؟' },
  { key: 'first_profit', title: 'اولین سود معنادار', prompt: 'از اولین سودی که برایت مهم بود چه چیزی یادت مانده؟ آن موقع چه حسی داشتی؟ اگر چنین خاطره‌ای نداری، می‌توانی ردش کنی.' },
  { key: 'worst_loss', title: 'بدترین ضرر', prompt: 'از بدترین ضرری که مایل هستی تعریف کنی بگو؛ آن موقع چه حسی داشتی و بعدش چه کردی؟' },
  { key: 'decision_style', title: 'شیوهٔ تصمیم‌گیری', prompt: 'معمولاً پیش از ورود چطور تصمیم می‌گیری؟ چه چیزی باعث می‌شود از برنامه‌ات فاصله بگیری؟' },
  { key: 'fears_and_excuses', title: 'ترس‌ها و بهانه‌ها', prompt: 'در ترید از چه چیزی بیشتر می‌ترسی؟ چه جمله یا بهانه‌ای را ممکن است به خودت تکرار کنی؟' },
  { key: 'hours_and_habits', title: 'ساعت‌ها و عادت‌ها', prompt: 'معمولاً چه ساعت‌هایی ترید می‌کنی و چه عادت‌هایی قبل یا بعد از معامله داری؟' },
  { key: 'life_context', title: 'شرایط زندگی', prompt: 'اگر دوست داری، از شرایطی مثل درس، کار، خستگی یا محدودیت زمانی/اینترنت بگو که روی تریدت اثر می‌گذارد. فقط به‌اندازه‌ای بگو که راحتی.' },
  { key: 'support_preferences', title: 'نوع همراهی استاد', prompt: 'وقتی از برنامه دور می‌شوی، چه نوع تذکری به تو کمک می‌کند؟ چه چیزی را دوست نداری استاد انجام دهد؟' },
];

export function createCoachPersonalProfile(now = new Date()) {
  const timestamp = now.toISOString();
  return {
    id: COACH_PERSONAL_PROFILE_ID,
    kind: 'coach_personal_profile',
    status: 'in_progress',
    answers: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: '',
  };
}

export function applyCoachPersonalProfileAnswer(profile, input, now = new Date()) {
  if (!profile || profile.status === 'completed') {
    return { profile, error: 'جلسهٔ آشنایی قبلاً تکمیل شده است.' };
  }
  const questionIndex = input?.questionIndex;
  const skipped = input?.skipped === true;
  const answer = skipped ? '' : typeof input?.answer === 'string' ? input.answer.trim() : '';
  if (!Number.isInteger(questionIndex) || questionIndex < 0
    || questionIndex >= COACH_PERSONAL_PROFILE_QUESTIONS.length
    || (!skipped && (!answer || answer.length > 3000))) {
    return { profile, error: 'پاسخ یا شمارهٔ بخش معتبر نیست.' };
  }
  const answers = Array.isArray(profile.answers) ? profile.answers : [];
  if (questionIndex < answers.length) {
    const previous = answers[questionIndex];
    if (previous?.skipped === skipped && String(previous?.answer || '') === answer) {
      return { profile, idempotent: true };
    }
    return { profile, error: 'این بخش قبلاً ثبت شده است؛ پاسخ قبلی تغییر نکرد.' };
  }
  if (questionIndex !== answers.length) {
    return { profile, error: 'بخش‌ها باید به‌ترتیب پاسخ داده شوند.' };
  }

  const question = COACH_PERSONAL_PROFILE_QUESTIONS[questionIndex];
  const timestamp = now.toISOString();
  const nextAnswers = [...answers, {
    key: question.key,
    title: question.title,
    answer: skipped ? '' : answer,
    skipped,
    updatedAt: timestamp,
  }];
  const completed = nextAnswers.length === COACH_PERSONAL_PROFILE_QUESTIONS.length;
  return {
    profile: {
      ...profile,
      status: completed ? 'completed' : 'in_progress',
      answers: nextAnswers,
      updatedAt: timestamp,
      completedAt: completed ? timestamp : '',
    },
    completed,
  };
}
