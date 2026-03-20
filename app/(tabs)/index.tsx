import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Vibration,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { QuizQuestion } from '../../types';
import { generateDailyChallenge } from '../../lib/quiz-generator';
import { calculateChallengeXP, getStreakMultiplier } from '../../lib/scoring';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Confetti Particle Component ───
function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const fallAnim = useRef(new Animated.Value(-20)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: SCREEN_HEIGHT + 50,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          ...Array.from({ length: 6 }).map(() =>
            Animated.timing(sway, {
              toValue: (Math.random() - 0.5) * 80,
              duration: 400 + Math.random() * 300,
              useNativeDriver: true,
            })
          ),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 3000,
          delay: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: (Math.random() - 0.5) * 10,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: startX,
        width: 8 + Math.random() * 6,
        height: 8 + Math.random() * 6,
        borderRadius: Math.random() > 0.5 ? 10 : 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateY: fallAnim },
          { translateX: sway },
          {
            rotate: rotate.interpolate({
              inputRange: [-10, 10],
              outputRange: ['-360deg', '360deg'],
            }),
          },
        ],
      }}
    />
  );
}

// ─── Floating XP Text ───
function FloatingXP({ amount, x, y }: { amount: number; x: number; y: number }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const floatOpacity = useRef(new Animated.Value(1)).current;
  const floatScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(floatY, {
        toValue: -120,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(floatOpacity, {
        toValue: 0,
        duration: 1200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(floatScale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: y,
        left: x,
        zIndex: 100,
        opacity: floatOpacity,
        transform: [{ translateY: floatY }, { scale: floatScale }],
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#D4AF37', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
        +{amount} XP
      </Text>
    </Animated.View>
  );
}

// ─── Animated Checkmark ───
function BigCheckmark({ visible }: { visible: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      rotation.setValue(0);
      opacity.setValue(1);
      ringScale.setValue(0.5);

      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 150, friction: 6, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(ringScale, { toValue: 1.5, tension: 100, friction: 5, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 2, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: '35%',
        alignSelf: 'center',
        zIndex: 50,
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Expanding ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 100,
          height: 100,
          borderRadius: 50,
          borderWidth: 3,
          borderColor: 'rgba(16, 185, 129, 0.3)',
          transform: [{ scale: ringScale }],
          opacity: ringScale.interpolate({ inputRange: [0.5, 2], outputRange: [0.8, 0] }),
        }}
      />
      {/* Checkmark circle */}
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#10B981',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 12,
          transform: [
            { scale },
            {
              rotate: rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['-90deg', '0deg'],
              }),
            },
          ],
        }}
      >
        <Ionicons name="checkmark" size={48} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Combo Banner ───
function ComboBanner({ combo }: { combo: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (combo >= 2) {
      scale.setValue(0.3);
      opacity.setValue(1);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 6, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [combo]);

  if (combo < 2) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: '25%',
        alignSelf: 'center',
        zIndex: 60,
        opacity,
        transform: [{ scale }],
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#D4AF37', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
        COMBO!
      </Text>
      {combo >= 3 && (
        <Text style={{ fontSize: 28, marginTop: -4 }}>🔥🔥🔥</Text>
      )}
    </Animated.View>
  );
}

// ─── Animated XP Counter for Result Screen ───
function AnimatedXPCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setDisplay(current);
    }, 40);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <Text style={styles.xpEarnedNumber}>+{display}</Text>
  );
}

// ─── Star Rating ───
function StarRating({ score, total }: { score: number; total: number }) {
  const pct = score / total;
  const stars = pct === 1 ? 3 : pct >= 0.6 ? 2 : pct >= 0.2 ? 1 : 0;

  const starAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    starAnims.forEach((anim, i) => {
      if (i < stars) {
        Animated.sequence([
          Animated.delay(300 + i * 250),
          Animated.spring(anim, { toValue: 1, tension: 150, friction: 6, useNativeDriver: true }),
        ]).start();
      }
    });
  }, [stars]);

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            transform: [
              {
                scale: starAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
              {
                rotate: starAnims[i].interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['0deg', '-30deg', '0deg'],
                }),
              },
            ],
          }}
        >
          <Ionicons
            name={i < stars ? 'star' : 'star-outline'}
            size={40}
            color={i < stars ? '#D4AF37' : '#D1D5DB'}
          />
        </Animated.View>
      ))}
    </View>
  );
}

// ─── CONFETTI COLORS ───
const CONFETTI_COLORS = ['#D4AF37', '#10B981', '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6'];

// ═══════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────
// ═══════════════════════════════════════════════════════
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
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(0);
  const [runningXP, setRunningXP] = useState(0);
  const [floatingXPs, setFloatingXPs] = useState<{ id: number; amount: number; x: number; y: number }[]>([]);
  const [showBigCheck, setShowBigCheck] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [screenFlashColor, setScreenFlashColor] = useState<string | null>(null);

  let floatIdRef = useRef(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const questionSlide = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const comboGlow = useRef(new Animated.Value(0)).current;
  const timerPulse = useRef(new Animated.Value(1)).current;
  const xpBarScale = useRef(new Animated.Value(1)).current;
  const optionScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerPulseRef = useRef<Animated.CompositeAnimation | null>(null);

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

      // Entrance animation
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

  // Timer pulse when < 5 seconds
  useEffect(() => {
    if (timer <= 5 && timer > 0 && !answered && questions.length > 0 && !challengeDone) {
      timerPulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulse, { toValue: 1.3, duration: 300, useNativeDriver: true }),
          Animated.timing(timerPulse, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      timerPulseRef.current.start();
    } else {
      timerPulseRef.current?.stop();
      timerPulse.setValue(1);
    }
    return () => {
      timerPulseRef.current?.stop();
    };
  }, [timer <= 5, answered]);

  // Combo glow animation
  useEffect(() => {
    if (combo >= 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(comboGlow, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(comboGlow, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      comboGlow.setValue(0);
    }
  }, [combo >= 2]);

  // Timer (30 seconds)
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
      setTimer((prev) => {
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
  }, [currentIndex, questions.length, challengeDone]);

  const flashScreen = (color: string) => {
    setScreenFlashColor(color);
    flashOpacity.setValue(0.35);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setScreenFlashColor(null));
  };

  const addFloatingXP = (amount: number) => {
    const id = ++floatIdRef.current;
    const x = SCREEN_WIDTH / 2 - 30 + (Math.random() - 0.5) * 60;
    const y = 140 + Math.random() * 40;
    setFloatingXPs((prev) => [...prev, { id, amount, x, y }]);
    setTimeout(() => {
      setFloatingXPs((prev) => prev.filter((f) => f.id !== id));
    }, 1500);
  };

  const animateXPBar = () => {
    Animated.sequence([
      Animated.spring(xpBarScale, { toValue: 1.15, tension: 300, friction: 6, useNativeDriver: true }),
      Animated.spring(xpBarScale, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const animateCorrect = () => {
    setShowCorrectFeedback(true);
    setShowBigCheck(true);
    flashScreen('#10B981');
    Vibration.vibrate([0, 50, 30, 50]); // Success pattern

    setTimeout(() => {
      setShowBigCheck(false);
      setShowCorrectFeedback(false);
    }, 1500);
  };

  const animateWrong = () => {
    setShowWrongFeedback(true);
    flashScreen('#EF4444');
    Vibration.vibrate(200); // Single buzz for wrong

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => setShowWrongFeedback(false));
  };

  const animateNextQuestion = () => {
    questionSlide.setValue(SCREEN_WIDTH);
    Animated.spring(questionSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    // Reset option scales
    optionScales.forEach((s) => s.setValue(1));
  };

  const pressOption = (index: number) => {
    Animated.sequence([
      Animated.timing(optionScales[index], { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(optionScales[index], { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = async (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);

    if (optionIndex >= 0) pressOption(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const question = questions[currentIndex];
    const correct = optionIndex === question.correctIndex;

    if (correct) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setScore((prev) => prev + 1);

      // XP calculation with combo bonus
      const xpGain = newCombo >= 3 ? 20 : newCombo >= 2 ? 15 : 10;
      setRunningXP((prev) => prev + xpGain);
      addFloatingXP(xpGain);
      animateXPBar();

      if (newCombo >= 2) {
        setShowCombo(newCombo);
        Vibration.vibrate([0, 30, 20, 30, 20, 60]); // Combo vibration
      }

      animateCorrect();
    } else {
      setCombo(0);
      setLives((prev) => Math.max(0, prev - 1));
      animateWrong();
    }

    setTimeout(async () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setAnswered(false);
        setSelectedIndex(null);
        setShowCombo(0);
        animateNextQuestion();
      } else {
        const finalScore = correct ? score + 1 : score;
        const xp = calculateChallengeXP(finalScore, streak);
        setXpEarned(xp);
        setChallengeDone(true);

        // Show confetti on perfect score
        if (finalScore === questions.length) {
          setShowConfetti(true);
          Vibration.vibrate([0, 50, 50, 50, 50, 100, 50, 200]);
        }

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

  // ──── STATE SCREENS ────

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

  // ──── RESULT SCREEN (challenge done after playing) ────
  if (challengeDone) {
    const percentage = Math.round((score / 5) * 100);
    const isPerfect = score === 5;

    return (
      <View style={styles.container}>
        {/* Confetti */}
        {showConfetti &&
          Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 60}
              color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              startX={Math.random() * SCREEN_WIDTH}
            />
          ))}

        <Animated.View
          style={[
            styles.doneContainer,
            {
              transform: [
                {
                  scale: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.doneIconCircle, isPerfect && styles.doneIconPerfect]}>
            <Ionicons name={isPerfect ? 'star' : 'trophy'} size={48} color="#fff" />
          </View>

          <Text style={styles.doneTitle}>
            {isPerfect ? 'Parfait !' : score >= 3 ? 'Bien joue !' : 'Continue tes efforts !'}
          </Text>

          {/* Star Rating */}
          <StarRating score={score} total={5} />

          {/* Score circles */}
          <View style={styles.scoreCircles}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={i}
                style={[styles.scoreCircle, i < score ? styles.scoreCircleCorrect : styles.scoreCircleWrong]}
              >
                <Ionicons name={i < score ? 'checkmark' : 'close'} size={16} color="#fff" />
              </View>
            ))}
          </View>

          <Text style={styles.scoreText}>
            {score}/5 ({percentage}%)
          </Text>

          {/* Animated XP earned */}
          <View style={styles.xpEarnedCard}>
            <Ionicons name="flash" size={24} color="#D4AF37" />
            <AnimatedXPCounter target={xpEarned} />
            <Text style={styles.xpEarnedLabel}>XP</Text>
          </View>

          {/* Streak */}
          <View style={styles.streakCardSmall}>
            <Ionicons name="flame" size={24} color="#F97316" />
            <Text style={styles.streakCardNumber}>{streak} jours</Text>
          </View>

          {/* Share placeholder */}
          <TouchableOpacity style={styles.shareButton} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Partager</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="refresh" size={32} color="#D4AF37" />
          </Animated.View>
          <Text style={styles.loadingText}>Preparation du challenge...</Text>
        </View>
      </View>
    );
  }

  // ──── MAIN QUIZ VIEW ────
  const question = questions[currentIndex];
  const timerColor = timer <= 5 ? '#EF4444' : timer <= 10 ? '#F59E0B' : '#10B981';

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] },
      ]}
    >
      {/* Screen flash overlay */}
      {screenFlashColor && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: screenFlashColor,
            opacity: flashOpacity,
            zIndex: 40,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Big animated checkmark */}
      <BigCheckmark visible={showBigCheck} />

      {/* Combo banner */}
      <ComboBanner combo={showCombo} />

      {/* Floating XP texts */}
      {floatingXPs.map((f) => (
        <FloatingXP key={f.id} amount={f.amount} x={f.x} y={f.y} />
      ))}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${(currentIndex / questions.length) * 100}%` },
              ]}
            />
            <View style={styles.progressDots}>
              {Array.from({ length: questions.length }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < currentIndex && styles.progressDotDone,
                    i === currentIndex && styles.progressDotCurrent,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Info bar */}
          <View style={styles.headerInfo}>
            {/* Lives */}
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

            {/* XP Counter */}
            <Animated.View style={[styles.xpCounter, { transform: [{ scale: xpBarScale }] }]}>
              <Ionicons name="flash" size={14} color="#D4AF37" />
              <Text style={styles.xpCounterText}>{runningXP} XP</Text>
            </Animated.View>

            {/* Timer */}
            <Animated.View
              style={[
                styles.timerContainer,
                { transform: [{ scale: timer <= 5 ? timerPulse : 1 }] },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{timer}s</Text>
            </Animated.View>

            {/* Streak */}
            <View style={styles.headerStreak}>
              <Ionicons name="flame" size={18} color="#F97316" />
              <Text style={styles.headerStreakText}>{streak}</Text>
            </View>
          </View>

          {/* Timer bar with color transition */}
          <Animated.View
            style={[
              styles.timerBar,
              {
                width: timerWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: timerWidth.interpolate({
                  inputRange: [0, 0.17, 0.33, 1],
                  outputRange: ['#EF4444', '#EF4444', '#F59E0B', '#10B981'],
                }),
              },
            ]}
          />

          {/* Combo indicator */}
          {combo >= 2 && (
            <Animated.View style={[styles.comboIndicator, { opacity: comboGlow }]}>
              <Text style={styles.comboText}>
                {combo >= 3 ? '🔥 ' : ''}x{combo} COMBO{combo >= 3 ? ' 🔥' : ''}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* ─── Question Card ─── */}
        <Animated.View
          style={[styles.questionContainer, { transform: [{ translateX: questionSlide }] }]}
        >
          <Text style={styles.questionCount}>
            Question {currentIndex + 1}/{questions.length}
          </Text>
          <Text style={styles.questionType}>{question.questionText}</Text>

          {question.questionArabic && (
            <View style={styles.arabicContainer}>
              <View style={styles.arabicDecor}>
                <View style={styles.arabicLine} />
                <Ionicons name="book" size={16} color="#D4AF37" />
                <View style={styles.arabicLine} />
              </View>
              <Text style={styles.arabicText}>{question.questionArabic}</Text>
              <View style={styles.arabicBottomDecor}>
                <View style={styles.arabicLine} />
                <View style={styles.arabicDiamond} />
                <View style={styles.arabicLine} />
              </View>
            </View>
          )}
        </Animated.View>

        {/* ─── Options ─── */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isCorrect = index === question.correctIndex;
            const isWrong = isSelected && !isCorrect;

            return (
              <Animated.View
                key={index}
                style={{ transform: [{ scale: optionScales[index] }] }}
              >
                <TouchableOpacity
                  style={[
                    styles.option,
                    answered && isCorrect && styles.optionCorrect,
                    answered && isWrong && styles.optionWrong,
                    !answered && styles.optionDefault,
                  ]}
                  onPress={() => handleAnswer(index)}
                  disabled={answered}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.optionLetter,
                      answered && isCorrect && styles.optionLetterCorrect,
                      answered && isWrong && styles.optionLetterWrong,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetterText,
                        answered && isCorrect && { color: '#fff' },
                        answered && isWrong && { color: '#fff' },
                      ]}
                    >
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      answered && isCorrect && styles.optionTextCorrect,
                      answered && isWrong && styles.optionTextWrong,
                    ]}
                  >
                    {option}
                  </Text>
                  {answered && isCorrect && (
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  )}
                  {answered && isWrong && (
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════
// ─── STYLES ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 20 },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1B4332',
    borderRadius: 4,
  },
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    borderWidth: 2.5,
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

  // XP counter in header
  xpCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  xpCounterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D4AF37',
  },

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
  timerBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },

  // Combo indicator
  comboIndicator: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  comboText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 1,
  },

  // Question
  questionContainer: { marginBottom: 24 },
  questionCount: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
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
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
    shadowColor: '#0D2818',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  arabicDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  arabicBottomDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  arabicDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#D4AF37',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },
  arabicLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' },
  arabicText: {
    fontSize: 28,
    lineHeight: 52,
    textAlign: 'right',
    color: '#0D2818',
    writingDirection: 'rtl',
  },

  // Options
  optionsContainer: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  optionDefault: {
    shadowColor: '#0D2818',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    borderWidth: 2.5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  optionWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderWidth: 2.5,
  },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  doneIconPerfect: {
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
  },
  doneTitle: { fontSize: 28, fontWeight: '800', color: '#0D2818', marginTop: 20 },
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
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  streakFlame: { marginBottom: 4 },
  streakNumber: { fontSize: 44, fontWeight: '900', color: '#F97316' },
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
  scoreCircles: { flexDirection: 'row', gap: 10, marginTop: 20 },
  scoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleCorrect: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreCircleWrong: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },

  // XP earned
  xpEarnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  xpEarnedNumber: { fontSize: 32, fontWeight: '900', color: '#D4AF37' },
  xpEarnedLabel: { fontSize: 18, color: '#D4AF37', fontWeight: '700' },

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

  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#0D2818',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0D2818',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
