import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated, Easing, Dimensions } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getSurah } from '../../lib/quran';
import { generateQuizForSurah } from '../../lib/quiz-generator';
import { calculateQuestionXP, calculateSurahMasteredXP, getStreakMultiplier } from '../../lib/scoring';
import { QuizQuestion } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function QuizScreen() {
  const { surahId } = useLocalSearchParams<{ surahId: string }>();
  const surahNumber = parseInt(surahId);
  const surah = getSurah(surahNumber);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [lives, setLives] = useState(5);
  const [startTime, setStartTime] = useState(0);
  const [timer, setTimer] = useState(30);
  const [combo, setCombo] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const questionSlide = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const correctPop = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const comboAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const q = generateQuizForSurah(surahNumber, 10);
    setQuestions(q);
    setStartTime(Date.now());

    AsyncStorage.getItem('lives').then(val => {
      setLives(val ? parseInt(val) : 5);
    });

    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [surahNumber]);

  // Timer
  useEffect(() => {
    if (questions.length === 0 || quizDone || answered) return;

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
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, questions.length, quizDone]);

  const animateCorrect = () => {
    Animated.sequence([
      Animated.spring(correctPop, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
      Animated.timing(correctPop, { toValue: 0, duration: 400, delay: 500, useNativeDriver: true }),
    ]).start();
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateCombo = (newCombo: number) => {
    if (newCombo >= 2) {
      Animated.sequence([
        Animated.spring(comboAnim, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
        Animated.timing(comboAnim, { toValue: 0, duration: 600, delay: 800, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const question = questions[currentIndex];
    const correct = optionIndex === question.correctIndex;
    const responseTime = Date.now() - startTime;

    if (correct) {
      const xp = calculateQuestionXP(true, responseTime);
      setScore(prev => prev + 1);
      setTotalXPEarned(prev => prev + xp);
      setCombo(prev => prev + 1);
      animateCorrect();
      animateCombo(combo + 1);
    } else {
      const newLives = Math.max(0, lives - 1);
      setLives(newLives);
      setCombo(0);
      animateWrong();
      await AsyncStorage.setItem('lives', String(newLives));

      if (newLives === 0) {
        setTimeout(() => {
          Alert.alert(
            'Plus de vies !',
            'Tes vies se regenerent en 1 heure. Reviens plus tard insha\'Allah.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }, 1000);
        return;
      }
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedIndex(null);
        setStartTime(Date.now());

        // Slide animation
        questionSlide.setValue(SCREEN_WIDTH);
        Animated.spring(questionSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
      } else {
        finishQuiz(correct ? score + 1 : score);
      }
    }, 1500);
  };

  const finishQuiz = async (finalScore: number) => {
    setQuizDone(true);

    // Celebration animation
    Animated.spring(resultScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();

    const percentage = (finalScore / questions.length) * 100;
    let xpTotal = totalXPEarned;

    try {
      const stored = await AsyncStorage.getItem('surahProgress');
      const progress: Record<string, string> = stored ? JSON.parse(stored) : {};

      if (percentage >= 80) {
        progress[String(surahNumber)] = 'mastered';
        const streakStr = await AsyncStorage.getItem('streak');
        const streak = streakStr ? parseInt(streakStr) : 0;
        const masteryXP = calculateSurahMasteredXP(streak);
        xpTotal += masteryXP;
      } else {
        progress[String(surahNumber)] = 'learning';
      }

      await AsyncStorage.setItem('surahProgress', JSON.stringify(progress));

      const currentXP = await AsyncStorage.getItem('totalXP');
      const newTotal = (currentXP ? parseInt(currentXP) : 0) + xpTotal;
      await AsyncStorage.setItem('totalXP', String(newTotal));

      const reviewDates = await AsyncStorage.getItem('surahReviewDates');
      const dates: Record<string, string> = reviewDates ? JSON.parse(reviewDates) : {};
      dates[String(surahNumber)] = new Date().toISOString();
      await AsyncStorage.setItem('surahReviewDates', JSON.stringify(dates));

      setTotalXPEarned(xpTotal);
    } catch (e) {
      console.error('Erreur sauvegarde quiz:', e);
    }
  };

  if (!surah) {
    return <View style={styles.container}><Text>Sourate non trouvee</Text></View>;
  }

  // ---- Ecran resultat ----
  if (quizDone) {
    const percentage = Math.round((score / questions.length) * 100);
    const mastered = percentage >= 80;
    const isPerfect = score === questions.length;

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '', headerStyle: { backgroundColor: '#0D2818' } }} />
        <Animated.View style={[styles.resultContainer, { transform: [{ scale: resultScale }] }]}>
          {/* Icon */}
          <View style={[styles.resultIcon, mastered ? styles.resultIconMastered : styles.resultIconRetry]}>
            <Ionicons
              name={isPerfect ? 'star' : mastered ? 'checkmark-circle' : 'refresh'}
              size={52}
              color="#fff"
            />
          </View>

          <Text style={styles.resultTitle}>
            {isPerfect ? 'Parfait !' : mastered ? 'Sourate maitrisee !' : 'Continue de reviser'}
          </Text>
          <Text style={styles.resultSurah}>{surah.nameArabic} - {surah.nameFrench}</Text>

          {/* Score visual */}
          <View style={styles.resultScoreCircles}>
            {Array.from({ length: questions.length }).map((_, i) => (
              <View key={i} style={[
                styles.resultScoreDot,
                i < score ? styles.resultScoreDotCorrect : styles.resultScoreDotWrong,
              ]}>
                <Ionicons name={i < score ? 'checkmark' : 'close'} size={12} color="#fff" />
              </View>
            ))}
          </View>

          <Text style={styles.resultScore}>{score}/{questions.length}</Text>
          <Text style={styles.resultPercent}>{percentage}%</Text>

          {!mastered && (
            <View style={styles.resultHintCard}>
              <Ionicons name="information-circle" size={18} color="#D4AF37" />
              <Text style={styles.resultHint}>Il faut 80% pour maitriser la sourate</Text>
            </View>
          )}

          {/* XP */}
          <View style={styles.resultXPCard}>
            <Ionicons name="flash" size={28} color="#D4AF37" />
            <Text style={styles.resultXPNumber}>+{totalXPEarned}</Text>
            <Text style={styles.resultXPLabel}>XP gagnes</Text>
          </View>

          {/* Actions */}
          <View style={styles.resultButtons}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setQuestions(generateQuizForSurah(surahNumber, 10));
                setCurrentIndex(0);
                setScore(0);
                setAnswered(false);
                setSelectedIndex(null);
                setQuizDone(false);
                setTotalXPEarned(0);
                setStartTime(Date.now());
                setCombo(0);
                resultScale.setValue(0);
              }}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryText}>Recommencer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color="#D4AF37" />
          <Text style={styles.loadingText}>Preparation du quiz...</Text>
        </View>
      </View>
    );
  }

  const question = questions[currentIndex];
  const timerColor = timer <= 5 ? '#EF4444' : timer <= 10 ? '#F59E0B' : '#10B981';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
      <Stack.Screen options={{ title: surah.nameArabic, headerStyle: { backgroundColor: '#0D2818' }, headerTintColor: '#D4AF37' }} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentIndex) / questions.length) * 100}%` }]} />
          </View>

          <View style={styles.headerInfo}>
            {/* Lives */}
            <View style={styles.livesContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < lives ? 'heart' : 'heart-outline'}
                  size={16}
                  color={i < lives ? '#EF4444' : '#E5E7EB'}
                />
              ))}
            </View>

            {/* Timer */}
            <View style={[styles.timerBadge, { borderColor: timerColor }]}>
              <Ionicons name="time-outline" size={14} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{timer}s</Text>
            </View>

            {/* Score */}
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>{score}/{currentIndex}</Text>
            </View>
          </View>

          {/* Timer bar */}
          <Animated.View style={[styles.timerBar, { width: timerWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: timerColor }]} />
        </View>

        {/* Combo banner */}
        {combo >= 2 && (
          <Animated.View style={[styles.comboBanner, { transform: [{ scale: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }], opacity: comboAnim }]}>
            <Ionicons name="flash" size={18} color="#D4AF37" />
            <Text style={styles.comboText}>Combo x{combo} !</Text>
          </Animated.View>
        )}

        {/* Correct feedback */}
        <Animated.View style={[styles.feedbackOverlay, {
          opacity: correctPop,
          transform: [{ scale: correctPop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }]}>
          <View style={styles.feedbackCorrectCircle}>
            <Ionicons name="checkmark" size={32} color="#fff" />
          </View>
        </Animated.View>

        {/* Question */}
        <Animated.View style={[styles.questionContainer, { transform: [{ translateX: questionSlide }] }]}>
          <Text style={styles.questionCount}>Question {currentIndex + 1}/{questions.length}</Text>
          <Text style={styles.questionType}>{question.questionText}</Text>

          {question.questionArabic && (
            <View style={styles.arabicContainer}>
              <View style={styles.arabicDecor}>
                <View style={styles.arabicLine} />
                <Text style={styles.arabicDecorSymbol}>۞</Text>
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
                ]}
                onPress={() => handleAnswer(index)}
                disabled={answered}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.optionIndex,
                  answered && isCorrect && styles.optionIndexCorrect,
                  answered && isWrong && styles.optionIndexWrong,
                ]}>
                  <Text style={[styles.optionIndexText, (answered && (isCorrect || isWrong)) && { color: '#fff' }]}>
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
                {answered && isCorrect && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                {answered && isWrong && <Ionicons name="close-circle" size={22} color="#EF4444" />}
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
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 3 },
  headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  livesContainer: { flexDirection: 'row', gap: 2 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  timerText: { fontSize: 15, fontWeight: '700' },
  scoreBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  timerBar: { height: 3, borderRadius: 2, marginTop: 8 },

  // Combo
  comboBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  comboText: { fontSize: 16, fontWeight: '800', color: '#D4AF37' },

  // Feedback
  feedbackOverlay: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -30,
    zIndex: 10,
  },
  feedbackCorrectCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Question
  questionContainer: { marginBottom: 24 },
  questionCount: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 4, fontWeight: '500' },
  questionType: { fontSize: 20, fontWeight: '700', color: '#0D2818', marginBottom: 16, textAlign: 'center', lineHeight: 28 },
  arabicContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  arabicDecor: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  arabicLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' },
  arabicDecorSymbol: { fontSize: 16, color: '#D4AF37', marginHorizontal: 10 },
  arabicText: { fontSize: 26, lineHeight: 48, textAlign: 'right', color: '#0D2818', writingDirection: 'rtl' },

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  optionIndex: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndexCorrect: { backgroundColor: '#10B981' },
  optionIndexWrong: { backgroundColor: '#EF4444' },
  optionIndexText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  optionText: { flex: 1, fontSize: 16, color: '#374151', textAlign: 'right', lineHeight: 26 },
  optionTextCorrect: { color: '#065F46', fontWeight: '600' },
  optionTextWrong: { color: '#991B1B' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#6B7280' },

  // Results
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  resultIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  resultIconMastered: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  resultIconRetry: { backgroundColor: '#F97316', shadowColor: '#F97316' },
  resultTitle: { fontSize: 26, fontWeight: '800', color: '#0D2818', marginTop: 20 },
  resultSurah: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  resultScoreCircles: { flexDirection: 'row', gap: 6, marginTop: 20 },
  resultScoreDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultScoreDotCorrect: { backgroundColor: '#10B981' },
  resultScoreDotWrong: { backgroundColor: '#EF4444' },
  resultScore: { fontSize: 20, fontWeight: '700', color: '#0D2818', marginTop: 12 },
  resultPercent: { fontSize: 14, color: '#6B7280' },
  resultHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resultHint: { fontSize: 13, color: '#D4AF37', fontWeight: '500' },
  resultXPCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  resultXPNumber: { fontSize: 28, fontWeight: '800', color: '#D4AF37' },
  resultXPLabel: { fontSize: 14, color: '#D4AF37', fontWeight: '500' },
  resultButtons: { flexDirection: 'row', gap: 12, marginTop: 28 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2818',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  backText: { color: '#374151', fontWeight: '600', fontSize: 16 },
});
