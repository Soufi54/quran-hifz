import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Dimensions } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { QuizQuestion } from '../../types';
import { generateDailyChallenge } from '../../lib/quiz-generator';
import { calculateChallengeXP, getStreakMultiplier } from '../../lib/scoring';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChallengeScreen() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [lives, setLives] = useState(5);
  const [noSurahs, setNoSurahs] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [showWrongFeedback, setShowWrongFeedback] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const correctPop = useRef(new Animated.Value(0)).current;
  const xpCounterAnim = useRef(new Animated.Value(0)).current;
  const questionSlide = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadChallenge = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastChallenge = await AsyncStorage.getItem('lastChallengeDate');
      if (lastChallenge === today) {
        setChallengeDone(true);
        const savedStreak = await AsyncStorage.getItem('streak');
        setStreak(savedStreak ? parseInt(savedStreak) : 0);
        return;
      }

      const progressStr = await AsyncStorage.getItem('surahProgress');
      const progress: Record<string, string> = progressStr ? JSON.parse(progressStr) : {};
      const learnedSurahs = Object.entries(progress)
        .filter(([_, status]) => status !== 'not_started')
        .map(([num]) => parseInt(num));

      if (learnedSurahs.length === 0) {
        setNoSurahs(true);
        return;
      }

      const savedStreak = await AsyncStorage.getItem('streak');
      setStreak(savedStreak ? parseInt(savedStreak) : 0);

      const savedLives = await AsyncStorage.getItem('lives');
      setLives(savedLives ? parseInt(savedLives) : 5);

      const q = generateDailyChallenge(learnedSurahs, 5);
      setQuestions(q);

      // Animation d'entree
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.error('Erreur chargement challenge:', e);
    }
  }, []);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // Timer de 30 secondes
  useEffect(() => {
    if (questions.length === 0 || challengeDone || answered) return;

    setTimer(30);
    timerWidth.setValue(1);

    Animated.timing(timerWidth, {
      toValue: 0,
      duration: 30000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Temps ecoule - mauvaise reponse
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, questions.length, challengeDone]);

  const animateCorrect = () => {
    setShowCorrectFeedback(true);
    Animated.sequence([
      Animated.spring(correctPop, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
      Animated.timing(correctPop, { toValue: 0, duration: 400, delay: 600, useNativeDriver: true }),
    ]).start(() => setShowCorrectFeedback(false));
  };

  const animateWrong = () => {
    setShowWrongFeedback(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => setShowWrongFeedback(false));
  };

  const animateNextQuestion = () => {
    questionSlide.setValue(SCREEN_WIDTH);
    Animated.spring(questionSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
  };

  const handleAnswer = async (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);

    if (timerRef.current) clearInterval(timerRef.current);

    const question = questions[currentIndex];
    const correct = optionIndex === question.correctIndex;

    if (correct) {
      setScore(prev => prev + 1);
      animateCorrect();
    } else {
      setLives(prev => Math.max(0, prev - 1));
      animateWrong();
    }

    setTimeout(async () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedIndex(null);
        animateNextQuestion();
      } else {
        const finalScore = correct ? score + 1 : score;
        const xp = calculateChallengeXP(finalScore, streak);
        setXpEarned(xp);
        setChallengeDone(true);

        // Celebration animation
        Animated.spring(celebrationAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();

        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem('lastChallengeDate', today);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const lastChallenge = await AsyncStorage.getItem('lastChallengeDate');

        let newStreak = 1;
        if (lastChallenge === yesterdayStr) {
          newStreak = streak + 1;
        }
        setStreak(newStreak);
        await AsyncStorage.setItem('streak', String(newStreak));

        const totalXP = await AsyncStorage.getItem('totalXP');
        const newTotal = (totalXP ? parseInt(totalXP) : 0) + xp;
        await AsyncStorage.setItem('totalXP', String(newTotal));
        await AsyncStorage.setItem('lives', String(lives));
      }
    }, 1500);
  };

  // ---- Ecrans d'etat ----
  if (noSurahs) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="book-outline" size={48} color="#D4AF37" />
          </View>
          <Text style={styles.emptyTitle}>Commence ton parcours</Text>
          <Text style={styles.emptyText}>
            Ouvre une sourate dans l'onglet "Sourates" pour debloquer le challenge quotidien
          </Text>
          <View style={styles.emptyArrow}>
            <Ionicons name="arrow-down" size={24} color="#D4AF37" />
          </View>
        </View>
      </View>
    );
  }

  if (challengeDone && questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.doneContainer}>
          <View style={styles.doneIconCircle}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>Challenge termine !</Text>
          <View style={styles.streakCard}>
            <View style={styles.streakFlame}>
              <Ionicons name="flame" size={32} color="#F97316" />
            </View>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>jours de streak</Text>
          </View>
          <Text style={styles.doneSubtitle}>Reviens demain pour continuer</Text>
          <View style={styles.multiplierBadge}>
            <Ionicons name="flash" size={16} color="#D4AF37" />
            <Text style={styles.multiplierText}>x{getStreakMultiplier(streak)} XP</Text>
          </View>
        </View>
      </View>
    );
  }

  if (challengeDone) {
    const percentage = Math.round((score / 5) * 100);
    const isPerfect = score === 5;
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.doneContainer, { transform: [{ scale: celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
          {/* Celebration */}
          <View style={[styles.doneIconCircle, isPerfect && styles.doneIconPerfect]}>
            <Ionicons name={isPerfect ? 'star' : 'trophy'} size={48} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>
            {isPerfect ? 'Parfait !' : score >= 3 ? 'Bien joue !' : 'Continue tes efforts !'}
          </Text>

          {/* Score circles */}
          <View style={styles.scoreCircles}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={[styles.scoreCircle, i < score ? styles.scoreCircleCorrect : styles.scoreCircleWrong]}>
                <Ionicons name={i < score ? 'checkmark' : 'close'} size={16} color="#fff" />
              </View>
            ))}
          </View>

          <Text style={styles.scoreText}>{score}/5 ({percentage}%)</Text>

          {/* XP earned */}
          <View style={styles.xpEarnedCard}>
            <Ionicons name="flash" size={24} color="#D4AF37" />
            <Text style={styles.xpEarnedNumber}>+{xpEarned}</Text>
            <Text style={styles.xpEarnedLabel}>XP</Text>
          </View>

          {/* Streak */}
          <View style={styles.streakCardSmall}>
            <Ionicons name="flame" size={24} color="#F97316" />
            <Text style={styles.streakCardNumber}>{streak} jours</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
            <Ionicons name="refresh" size={32} color="#D4AF37" />
          </Animated.View>
          <Text style={styles.loadingText}>Preparation du challenge...</Text>
        </View>
      </View>
    );
  }

  const question = questions[currentIndex];
  const timerColor = timer <= 5 ? '#EF4444' : timer <= 10 ? '#F59E0B' : '#10B981';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header premium */}
        <View style={styles.header}>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: `${((currentIndex) / questions.length) * 100}%` }]} />
            {/* Dots pour chaque question */}
            <View style={styles.progressDots}>
              {Array.from({ length: questions.length }).map((_, i) => (
                <View key={i} style={[
                  styles.progressDot,
                  i < currentIndex && styles.progressDotDone,
                  i === currentIndex && styles.progressDotCurrent,
                ]} />
              ))}
            </View>
          </View>

          {/* Info bar */}
          <View style={styles.headerInfo}>
            {/* Vies */}
            <View style={styles.livesContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < lives ? 'heart' : 'heart-outline'}
                  size={18}
                  color={i < lives ? '#EF4444' : '#E5E7EB'}
                />
              ))}
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{timer}s</Text>
            </View>

            {/* Streak */}
            <View style={styles.headerStreak}>
              <Ionicons name="flame" size={18} color="#F97316" />
              <Text style={styles.headerStreakText}>{streak}</Text>
            </View>
          </View>

          {/* Timer bar */}
          <Animated.View style={[styles.timerBar, { width: timerWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: timerColor }]} />
        </View>

        {/* Feedback correct */}
        {showCorrectFeedback && (
          <Animated.View style={[styles.feedbackBanner, styles.feedbackCorrect, { transform: [{ scale: correctPop }] }]}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.feedbackText}>Correct ! +10 XP</Text>
          </Animated.View>
        )}

        {/* Question */}
        <Animated.View style={[styles.questionContainer, { transform: [{ translateX: questionSlide }] }]}>
          <Text style={styles.questionCount}>Question {currentIndex + 1}/{questions.length}</Text>
          <Text style={styles.questionType}>{question.questionText}</Text>

          {question.questionArabic && (
            <View style={styles.arabicContainer}>
              <View style={styles.arabicDecor}>
                <View style={styles.arabicLine} />
                <Ionicons name="book" size={16} color="#D4AF37" />
                <View style={styles.arabicLine} />
              </View>
              <Text style={styles.arabicText}>{question.questionArabic}</Text>
            </View>
          )}
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isCorrect = index === question.correctIndex;
            const isWrong = isSelected && !isCorrect;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  answered && isCorrect && styles.optionCorrect,
                  answered && isWrong && styles.optionWrong,
                  !answered && styles.optionDefault,
                ]}
                onPress={() => handleAnswer(index)}
                disabled={answered}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.optionLetter,
                  answered && isCorrect && styles.optionLetterCorrect,
                  answered && isWrong && styles.optionLetterWrong,
                ]}>
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[
                  styles.optionText,
                  answered && isCorrect && styles.optionTextCorrect,
                  answered && isWrong && styles.optionTextWrong,
                ]}>
                  {option}
                </Text>
                {answered && isCorrect && (
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                )}
                {answered && isWrong && (
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 20 },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: { height: '100%', backgroundColor: '#1B4332', borderRadius: 3 },
  progressDots: {
    position: 'absolute',
    top: -5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: '5%',
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#fff',
  },
  progressDotDone: { backgroundColor: '#10B981' },
  progressDotCurrent: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  livesContainer: { flexDirection: 'row', gap: 3 },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 16, fontWeight: '700' },
  headerStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249,115,22,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerStreakText: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  timerBar: { height: 3, borderRadius: 2, marginTop: 8 },

  // Feedback
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  feedbackCorrect: { backgroundColor: '#10B981' },
  feedbackText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Question
  questionContainer: { marginBottom: 24 },
  questionCount: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 4, fontWeight: '500' },
  questionType: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D2818',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 28,
  },
  arabicContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  arabicDecor: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  arabicLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' },
  arabicText: {
    fontSize: 26,
    lineHeight: 48,
    textAlign: 'right',
    color: '#0D2818',
    writingDirection: 'rtl',
  },

  // Options
  optionsContainer: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  optionDefault: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  optionWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterCorrect: { backgroundColor: '#10B981' },
  optionLetterWrong: { backgroundColor: '#EF4444' },
  optionLetterText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    textAlign: 'right',
    lineHeight: 26,
  },
  optionTextCorrect: { color: '#065F46', fontWeight: '600' },
  optionTextWrong: { color: '#991B1B' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#6B7280' },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(212,175,55,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#0D2818', marginTop: 20 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  emptyArrow: { marginTop: 24, opacity: 0.5 },

  // Done state
  doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  doneIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  doneIconPerfect: { backgroundColor: '#D4AF37' },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#0D2818', marginTop: 20 },
  doneSubtitle: { fontSize: 15, color: '#6B7280', marginTop: 8 },

  // Streak card
  streakCard: {
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
    width: '70%',
  },
  streakFlame: { marginBottom: 4 },
  streakNumber: { fontSize: 40, fontWeight: '800', color: '#F97316' },
  streakLabel: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  multiplierText: { fontSize: 14, fontWeight: '700', color: '#D4AF37' },

  // Score circles
  scoreCircles: { flexDirection: 'row', gap: 8, marginTop: 20 },
  scoreCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleCorrect: { backgroundColor: '#10B981' },
  scoreCircleWrong: { backgroundColor: '#EF4444' },
  scoreText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },

  // XP earned
  xpEarnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  xpEarnedNumber: { fontSize: 28, fontWeight: '800', color: '#D4AF37' },
  xpEarnedLabel: { fontSize: 16, color: '#D4AF37', fontWeight: '600' },

  // Streak small
  streakCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    backgroundColor: 'rgba(249,115,22,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  streakCardNumber: { fontSize: 16, fontWeight: '700', color: '#F97316' },
});
