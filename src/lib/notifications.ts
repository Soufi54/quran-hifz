export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleStreakReminder(): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Rappel a 20h si le challenge n'est pas fait
  const now = new Date();
  const reminder = new Date();
  reminder.setHours(20, 0, 0, 0);

  if (now > reminder) {
    reminder.setDate(reminder.getDate() + 1);
  }

  const delay = reminder.getTime() - now.getTime();

  setTimeout(() => {
    const lastChallenge = localStorage.getItem('lastChallengeDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastChallenge !== today) {
      new Notification('QuranDuel', {
        body: 'Ne perds pas ton streak ! Fais ton challenge quotidien.',
        icon: '/icon-192.png',
        tag: 'streak-reminder',
      });
    }

    // Reprogrammer pour demain
    scheduleStreakReminder();
  }, delay);
}
