import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated, Easing, Dimensions, Vibration } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getSurah } from '../../lib/quran';
import { generateQuizForSurah } from '../../lib/quiz-generator';
import { calculateQuestionXP, calculateSurahMasteredXP, getStreakMultiplier } from '../../lib/scoring';
import { QuizQuestion } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, fontScale, spacing, SCREEN } from '../../lib/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Combo multiplier thresholds
const getComboMultiplier = (combo: number) => {
  if (combo >= 10) return 2.5;
  if (combo >= 7) return 2;
  if (combo >= 5) return 1.75;
  if (combo >= 3) return 1.5;
  if (combo >= 2) return 1.25;
  return 1;
};

const getComboLabel = (combo: number) => {
  if (combo >= 5) return 'UNSTOPPABLE!';
  if (combo >= 3) return 'FIRE!';
  if (combo >= 2) return 'Combo!';
  return '';
};

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
  const [lastXPGained, setLastXPGained] = useState(0);
  const [showXPFloat, setShowXPFloat] = useState(false);

  // Result screen states
  const [displayedXP, setDisplayedXP] = useState(0);
  const [starsRevealed, setStarsRevealed] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const questionSlide = useRef(new Animated.Value(0)).current;
  const questionRotate = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const correctPop = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const comboAnim = useRef(new Animated.Value(1)).current;
  const comboScale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flash overlays
  const greenFlash = useRef(new Animated.Value(0)).current;
  const redFlash = useRef(new Animated.Value(0)).current;

  // Floating XP
  const xpFloatY = useRef(new Animated.Value(0)).current;
  const xpFloatOpacity = useRef(new Animated.Value(0)).current;

  // Pulse rings
  const pulseRing1 = useRef(new Animated.Value(0)).current;
  const pulseRing2 = useRef(new Animated.Value(0)).current;

  // Combo crack
  const comboCrack = useRef(new Animated.Value(0)).current;

  // Option animations (4 options)
  const optionAnims = useRef(
    Array.from({ length: 4 }, () => ({
      scale: new Animated.Value(1),
      shake: new Animated.Value(0),
      pulse: new Animated.Value(1),
      opacity: new Animated.Value(1),
    }))
  ).current;

  // Progress bar smooth animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Result screen animations
  const scoreCircleProgress = useRef(new Animated.Value(0)).current;
  const starAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const retryPulse = useRef(new Animated.Value(1)).current;

  // Correct checkmark
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;

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

  // Smooth progress bar
  useEffect(() => {
    if (questions.length > 0) {
      Animated.timing(progressAnim, {
        toValue: currentIndex / questions.length,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentIndex, questions.length]);

  const animateCorrect = (optionIdx: number) => {
    // Haptic feedback
    try { Vibration.vibrate(50); } catch {}

    // Green flash overlay
    Animated.sequence([
      Animated.timing(greenFlash, { toValue: 0.35, duration: 150, useNativeDriver: true }),
      Animated.timing(greenFlash, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Big checkmark animation
    checkmarkScale.setValue(0);
    checkmarkOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(checkmarkScale, { toValue: 1.2, tension: 300, friction: 8, useNativeDriver: true }),
      Animated.spring(checkmarkScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.timing(checkmarkOpacity, { toValue: 0, duration: 400, delay: 400, useNativeDriver: true }),
    ]).start();

    // Pulse rings from selected answer
    pulseRing1.setValue(0);
    pulseRing2.setValue(0);
    Animated.stagger(150, [
      Animated.timing(pulseRing1, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pulseRing2, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Option pulses green 2x
    if (optionIdx >= 0 && optionIdx < 4) {
      const opt = optionAnims[optionIdx];
      Animated.sequence([
        Animated.timing(opt.pulse, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(opt.pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(opt.pulse, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(opt.pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      // Fade other options
      optionAnims.forEach((o, i) => {
        if (i !== optionIdx) {
          Animated.timing(o.opacity, { toValue: 0.4, duration: 400, useNativeDriver: true }).start();
        }
      });
    }
  };

  const animateWrong = (optionIdx: number) => {
    // Haptic feedback (stronger)
    try { Vibration.vibrate([0, 80, 50, 80]); } catch {}

    // Red flash overlay
    Animated.sequence([
      Animated.timing(redFlash, { toValue: 0.4, duration: 100, useNativeDriver: true }),
      Animated.timing(redFlash, { toValue: 0.15, duration: 100, useNativeDriver: true }),
      Animated.timing(redFlash, { toValue: 0.3, duration: 100, useNativeDriver: true }),
      Animated.timing(redFlash, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Screen shake (stronger)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 18, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -18, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 14, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    // Option shakes
    if (optionIdx >= 0 && optionIdx < 4) {
      const opt = optionAnims[optionIdx];
      Animated.sequence([
        Animated.timing(opt.shake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(opt.shake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(opt.shake, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(opt.shake, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(opt.shake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    // Fade non-correct options, highlight correct
    const correctIdx = questions[currentIndex]?.correctIndex;
    optionAnims.forEach((o, i) => {
      if (i !== correctIdx) {
        Animated.timing(o.opacity, { toValue: 0.4, duration: 400, useNativeDriver: true }).start();
      }
    });

    // Combo crack effect
    if (combo > 0) {
      comboCrack.setValue(1);
      Animated.sequence([
        Animated.timing(comboCrack, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(comboCrack, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  const animateFloatingXP = (xp: number) => {
    setLastXPGained(xp);
    setShowXPFloat(true);
    xpFloatY.setValue(0);
    xpFloatOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(xpFloatY, { toValue: -80, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(xpFloatOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => setShowXPFloat(false));
  };

  const animateCombo = (newCombo: number) => {
    if (newCombo >= 2) {
      // Combo counter bounce
      comboScale.setValue(0.3);
      Animated.spring(comboScale, { toValue: 1, tension: 300, friction: 6, useNativeDriver: true }).start();
      comboAnim.setValue(1);
    }
  };

  const resetOptionAnims = () => {
    optionAnims.forEach(o => {
      o.scale.setValue(1);
      o.shake.setValue(0);
      o.pulse.setValue(1);
      o.opacity.setValue(1);
    });
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
      const baseXP = calculateQuestionXP(true, responseTime);
      const multiplier = getComboMultiplier(combo + 1);
      const xp = Math.round(baseXP * multiplier);
      setScore(prev => prev + 1);
      setTotalXPEarned(prev => prev + xp);
      setCombo(prev => prev + 1);
      animateCorrect(optionIndex);
      animateCombo(combo + 1);
      animateFloatingXP(xp);
    } else {
      const newLives = Math.max(0, lives - 1);
      setLives(newLives);
      setCombo(0);
      animateWrong(optionIndex);
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
        resetOptionAnims();

        // Slide + rotate animation
        questionSlide.setValue(SCREEN_WIDTH);
        questionRotate.setValue(8);
        Animated.parallel([
          Animated.spring(questionSlide, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
          Animated.spring(questionRotate, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
        ]).start();
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

    // Animate score circle
    Animated.timing(scoreCircleProgress, {
      toValue: percentage / 100,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Animate stars one by one
    const starCount = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;
    for (let i = 0; i < starCount; i++) {
      setTimeout(() => {
        Animated.spring(starAnims[i], { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
        setStarsRevealed(i + 1);
        try { Vibration.vibrate(30); } catch {}
      }, 800 + i * 400);
    }

    // Count up XP
    const xpCountDuration = 1500;
    const xpSteps = 30;
    const stepDelay = xpCountDuration / xpSteps;
    for (let i = 1; i <= xpSteps; i++) {
      setTimeout(() => {
        setDisplayedXP(Math.round((i / xpSteps) * xpTotal));
      }, 500 + i * stepDelay);
    }

    // Retry pulse if score < 80%
    if (percentage < 80) {
      setTimeout(() => {
        const pulseLoop = () => {
          Animated.sequence([
            Animated.timing(retryPulse, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(retryPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]).start(() => pulseLoop());
        };
        pulseLoop();
      }, 2000);
    }

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

  // ---- Result Screen ----
  if (quizDone) {
    const percentage = Math.round((score / questions.length) * 100);
    const mastered = percentage >= 80;
    const isPerfect = score === questions.length;
    const starCount = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;

    const getMessage = () => {
      if (isPerfect) return 'Parfait !';
      if (percentage >= 90) return 'Excellent !';
      if (percentage >= 70) return 'Bien joue !';
      if (percentage >= 50) return 'Continue !';
      return 'Revise encore !';
    };

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '', headerStyle: { backgroundColor: '#0D2818' } }} />
        <Animated.View style={[styles.resultContainer, { transform: [{ scale: resultScale }] }]}>

          {/* Radial score circle */}
          <View style={styles.scoreCircleOuter}>
            <Animated.View style={[styles.scoreCircleFill, {
              transform: [{
                rotate: scoreCircleProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }],
            }]} />
            <View style={styles.scoreCircleInner}>
              <Text style={styles.scoreCirclePercent}>{percentage}%</Text>
              <Text style={styles.scoreCircleFraction}>{score}/{questions.length}</Text>
            </View>
          </View>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[0, 1, 2].map(i => (
              <Animated.View key={i} style={{
                transform: [
                  { scale: starAnims[i] },
                  { rotate: starAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) },
                ],
                opacity: starAnims[i],
              }}>
                <Ionicons
                  name="star"
                  size={i === 1 ? 48 : 36}
                  color={i < starCount ? '#D4AF37' : '#374151'}
                />
              </Animated.View>
            ))}
          </View>

          <Text style={styles.resultTitle}>{getMessage()}</Text>
          <Text style={styles.resultSurah}>{surah.nameArabic} - {surah.nameFrench}</Text>

          {/* Score dots */}
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

          {!mastered && (
            <View style={styles.resultHintCard}>
              <Ionicons name="information-circle" size={18} color="#D4AF37" />
              <Text style={styles.resultHint}>Il faut 80% pour maitriser la sourate</Text>
            </View>
          )}

          {/* XP counter (counts up) */}
          <View style={styles.resultXPCard}>
            <Ionicons name="flash" size={28} color="#D4AF37" />
            <Text style={styles.resultXPNumber}>+{displayedXP}</Text>
            <Text style={styles.resultXPLabel}>XP gagnes</Text>
          </View>

          {/* Actions */}
          <View style={styles.resultButtons}>
            <Animated.View style={{ transform: [{ scale: !mastered ? retryPulse : new Animated.Value(1) }] }}>
              <TouchableOpacity
                style={[styles.retryButton, !mastered && styles.retryButtonHighlight]}
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
                  setDisplayedXP(0);
                  setStarsRevealed(0);
                  resultScale.setValue(0);
                  scoreCircleProgress.setValue(0);
                  starAnims.forEach(a => a.setValue(0));
                  retryPulse.setValue(1);
                  resetOptionAnims();
                  progressAnim.setValue(0);
                }}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryText}>Recommencer</Text>
              </TouchableOpacity>
            </Animated.View>
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
  const comboMultiplier = getComboMultiplier(combo);
  const comboLabel = getComboLabel(combo);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
      <Stack.Screen options={{ title: surah.nameArabic, headerStyle: { backgroundColor: '#0D2818' }, headerTintColor: '#D4AF37' }} />

      {/* Green flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { backgroundColor: '#10B981', opacity: greenFlash }]} />
      {/* Red flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { backgroundColor: '#EF4444', opacity: redFlash }]} />

      {/* Big checkmark */}
      <Animated.View pointerEvents="none" style={[styles.bigCheckContainer, {
        opacity: checkmarkOpacity,
        transform: [{ scale: checkmarkScale }],
      }]}>
        <View style={styles.bigCheckCircle}>
          <Ionicons name="checkmark" size={56} color="#fff" />
        </View>
      </Animated.View>

      {/* Floating XP */}
      {showXPFloat && (
        <Animated.View pointerEvents="none" style={[styles.floatingXP, {
          opacity: xpFloatOpacity,
          transform: [{ translateY: xpFloatY }],
        }]}>
          <Text style={styles.floatingXPText}>+{lastXPGained} XP</Text>
          {comboMultiplier > 1 && (
            <Text style={styles.floatingXPMultiplier}>x{comboMultiplier}</Text>
          )}
        </Animated.View>
      )}

      {/* Pulse rings */}
      <Animated.View pointerEvents="none" style={[styles.pulseRing, {
        opacity: pulseRing1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
        transform: [{ scale: pulseRing1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.5] }) }],
      }]} />
      <Animated.View pointerEvents="none" style={[styles.pulseRing, {
        opacity: pulseRing2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
        transform: [{ scale: pulseRing2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }],
      }]} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Smooth gold progress bar */}
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
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
          <Animated.View style={[styles.timerBar, {
            width: timerWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: timerColor,
          }]} />
        </View>

        {/* Combo Banner */}
        {combo >= 2 && (
          <Animated.View style={[styles.comboBanner, {
            transform: [{ scale: comboScale }],
          }]}>
            <View style={styles.comboInner}>
              <Ionicons
                name={combo >= 5 ? 'flame' : 'flash'}
                size={combo >= 5 ? 24 : 20}
                color={combo >= 5 ? '#FF6B35' : '#D4AF37'}
              />
              <Text style={[styles.comboText, combo >= 5 && styles.comboTextFire]}>
                {comboLabel} x{combo}
              </Text>
              {comboMultiplier > 1 && (
                <View style={styles.comboMultiplierBadge}>
                  <Text style={styles.comboMultiplierText}>XP x{comboMultiplier}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Combo crack on reset */}
        {combo === 0 && (
          <Animated.View pointerEvents="none" style={[styles.comboCrack, {
            opacity: comboCrack.interpolate({ inputRange: [0, 0.5, 1, 1.3], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: comboCrack }],
          }]}>
            <Text style={styles.comboCrackText}>COMBO LOST!</Text>
          </Animated.View>
        )}

        {/* Question */}
        <Animated.View style={[styles.questionContainer, {
          transform: [
            { translateX: questionSlide },
            { rotate: questionRotate.interpolate({ inputRange: [-10, 0, 10], outputRange: ['-3deg', '0deg', '3deg'] }) },
          ],
        }]}>
          <Text style={styles.questionCount}>Question {currentIndex + 1}/{questions.length}</Text>
          <Text style={styles.questionType}>{question.questionText}</Text>

          {question.questionArabic && (
            <View style={styles.arabicContainer}>
              {/* Top ornamental border */}
              <View style={styles.arabicDecor}>
                <View style={styles.arabicLine} />
                <Text style={styles.arabicDecorSymbol}>۞</Text>
                <View style={styles.arabicLine} />
              </View>

              <Text style={styles.arabicText}>{question.questionArabic}</Text>

              {/* Bottom ornamental border */}
              <View style={[styles.arabicDecor, { marginBottom: 0, marginTop: 12 }]}>
                <View style={styles.arabicLine} />
                <Text style={styles.arabicDecorSymbol}>۞</Text>
                <View style={styles.arabicLine} />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isCorrect = index === question.correctIndex;
            const isWrong = isSelected && !isCorrect;
            const anim = optionAnims[index];

            return (
              <Animated.View key={index} style={{
                transform: [
                  { scale: anim.pulse },
                  { translateX: anim.shake },
                ],
                opacity: anim.opacity,
              }}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    answered && isCorrect && styles.optionCorrect,
                    answered && isWrong && styles.optionWrong,
                  ]}
                  onPress={() => handleAnswer(index)}
                  disabled={answered}
                  activeOpacity={0.85}
                  onPressIn={() => {
                    Animated.timing(anim.scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
                  }}
                  onPressOut={() => {
                    Animated.timing(anim.scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
                  }}
                >
                  {/* Diamond-shaped letter badge */}
                  <View style={[
                    styles.optionDiamond,
                    answered && isCorrect && styles.optionDiamondCorrect,
                    answered && isWrong && styles.optionDiamondWrong,
                  ]}>
                    <Text style={[styles.optionDiamondText, (answered && (isCorrect || isWrong)) && { color: '#fff' }]}>
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

                  {answered && isCorrect && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                  {answered && isWrong && <Ionicons name="close-circle" size={24} color="#EF4444" />}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { padding: spacing.md + spacing.xs, paddingBottom: scale(40) },

  // Flash overlays
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },

  // Big checkmark
  bigCheckContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 101,
  },
  bigCheckCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },

  // Floating XP
  floatingXP: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 102,
  },
  floatingXPText: {
    fontSize: fontScale(32),
    fontWeight: '900',
    color: '#D4AF37',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  floatingXPMultiplier: {
    fontSize: fontScale(18),
    fontWeight: '800',
    color: '#FF6B35',
    marginTop: scale(2),
  },

  // Pulse rings
  pulseRing: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.5 - scale(50),
    left: SCREEN_WIDTH * 0.5 - scale(50),
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 3,
    borderColor: '#10B981',
    zIndex: 99,
  },

  // Header
  header: { marginBottom: spacing.md + spacing.xs },
  progressBar: { height: scale(8), backgroundColor: '#E5E7EB', borderRadius: scale(4), overflow: 'hidden' },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: scale(4),
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm + spacing.xs },
  livesContainer: { flexDirection: 'row', gap: scale(2) },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    borderWidth: 1.5,
    gap: scale(4),
  },
  timerText: { fontSize: fontScale(15), fontWeight: '700' },
  scoreBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  scoreBadgeText: { fontSize: fontScale(14), fontWeight: '700', color: '#10B981' },
  timerBar: { height: scale(3), borderRadius: scale(2), marginTop: spacing.sm },

  // Combo
  comboBanner: {
    marginBottom: spacing.sm + spacing.xs,
  },
  comboInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingVertical: scale(10),
    paddingHorizontal: spacing.md,
    borderRadius: scale(14),
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  comboText: { fontSize: fontScale(18), fontWeight: '900', color: '#D4AF37', letterSpacing: 1 },
  comboTextFire: { color: '#FF6B35', fontSize: fontScale(20) },
  comboMultiplierBadge: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: spacing.sm,
    paddingVertical: scale(3),
    borderRadius: spacing.sm,
    marginLeft: scale(4),
  },
  comboMultiplierText: { fontSize: fontScale(12), fontWeight: '800', color: '#fff' },

  // Combo crack
  comboCrack: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  comboCrackText: {
    fontSize: fontScale(24),
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Question
  questionContainer: { marginBottom: spacing.lg },
  questionCount: { fontSize: fontScale(13), color: '#9CA3AF', textAlign: 'center', marginBottom: scale(4), fontWeight: '500' },
  questionType: { fontSize: fontScale(20), fontWeight: '700', color: '#0D2818', marginBottom: spacing.md, textAlign: 'center', lineHeight: fontScale(28) },
  arabicContainer: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: scale(18),
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.25)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  arabicDecor: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(14) },
  arabicLine: { flex: 1, height: 1.5, backgroundColor: 'rgba(212,175,55,0.35)' },
  arabicDecorSymbol: { fontSize: fontScale(20), color: '#D4AF37', marginHorizontal: spacing.sm + spacing.xs },
  arabicText: {
    fontSize: fontScale(30),
    lineHeight: fontScale(54),
    textAlign: 'right',
    color: '#0D2818',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(212,175,55,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Options
  optionsContainer: { gap: spacing.sm + spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: spacing.sm + spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    minHeight: scale(48),
  },
  optionCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },

  // Diamond-shaped letter badge
  optionDiamond: {
    width: scale(34),
    height: scale(34),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
    borderRadius: scale(6),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  optionDiamondCorrect: { backgroundColor: '#10B981', borderColor: '#10B981' },
  optionDiamondWrong: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  optionDiamondText: {
    fontSize: fontScale(14),
    fontWeight: '800',
    color: '#374151',
    transform: [{ rotate: '-45deg' }],
  },

  optionText: { flex: 1, fontSize: fontScale(16), color: '#374151', textAlign: 'right', lineHeight: fontScale(26) },
  optionTextCorrect: { color: '#065F46', fontWeight: '600' },
  optionTextWrong: { color: '#991B1B' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontScale(16), color: '#6B7280' },

  // Results
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },

  // Score circle
  scoreCircleOuter: {
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scoreCircleFill: {
    position: 'absolute',
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: '#10B981',
  },
  scoreCircleInner: {
    width: scale(112),
    height: scale(112),
    borderRadius: scale(56),
    backgroundColor: '#FAFAF7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  scoreCirclePercent: {
    fontSize: fontScale(32),
    fontWeight: '900',
    color: '#0D2818',
  },
  scoreCircleFraction: {
    fontSize: fontScale(14),
    color: '#6B7280',
    fontWeight: '600',
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: scale(20),
    height: scale(50),
  },

  resultTitle: { fontSize: fontScale(28), fontWeight: '900', color: '#0D2818', marginTop: spacing.md, letterSpacing: 0.5 },
  resultSurah: { fontSize: fontScale(16), color: '#6B7280', marginTop: scale(4) },
  resultScoreCircles: { flexDirection: 'row', gap: scale(6), marginTop: spacing.md },
  resultScoreDot: { width: scale(24), height: scale(24), borderRadius: scale(12), justifyContent: 'center', alignItems: 'center' },
  resultScoreDotCorrect: { backgroundColor: '#10B981' },
  resultScoreDotWrong: { backgroundColor: '#EF4444' },
  resultHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm + spacing.xs,
    gap: scale(6),
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingHorizontal: scale(14),
    paddingVertical: spacing.sm,
    borderRadius: scale(10),
  },
  resultHint: { fontSize: fontScale(13), color: '#D4AF37', fontWeight: '500' },
  resultXPCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(20),
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: scale(16),
    gap: scale(10),
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  resultXPNumber: { fontSize: fontScale(32), fontWeight: '900', color: '#D4AF37' },
  resultXPLabel: { fontSize: fontScale(14), color: '#D4AF37', fontWeight: '600' },
  resultButtons: { flexDirection: 'row', gap: spacing.sm + spacing.xs, marginTop: scale(28) },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2818',
    paddingHorizontal: spacing.lg,
    paddingVertical: scale(14),
    borderRadius: scale(14),
    gap: spacing.sm,
    minHeight: scale(48),
  },
  retryButtonHighlight: {
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: fontScale(16) },
  backButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.lg,
    paddingVertical: scale(14),
    borderRadius: scale(14),
    minHeight: scale(48),
    justifyContent: 'center',
  },
  backText: { color: '#374151', fontWeight: '600', fontSize: fontScale(16) },
});
