import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { QuizQuestion } from '../../types';
import { generateDailyChallenge } from '../../lib/quiz-generator';
import { calculateChallengeXP } from '../../lib/scoring';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const loadChallenge = useCallback(async () => {
    try {
      // Verifier si le challenge a deja ete fait aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const lastChallenge = await AsyncStorage.getItem('lastChallengeDate');
      if (lastChallenge === today) {
        setChallengeDone(true);
        const savedStreak = await AsyncStorage.getItem('streak');
        setStreak(savedStreak ? parseInt(savedStreak) : 0);
        return;
      }

      // Charger les sourates apprises
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
    } catch (e) {
      console.error('Erreur chargement challenge:', e);
    }
  }, []);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleAnswer = async (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);

    const question = questions[currentIndex];
    const correct = optionIndex === question.correctIndex;

    if (correct) {
      setScore(prev => prev + 1);
    } else {
      setLives(prev => Math.max(0, prev - 1));
    }

    // Attendre 1.5s puis passer a la question suivante
    setTimeout(async () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedIndex(null);
      } else {
        // Challenge termine
        const finalScore = correct ? score + 1 : score;
        const xp = calculateChallengeXP(finalScore, streak);
        setXpEarned(xp);
        setChallengeDone(true);

        // Sauvegarder
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem('lastChallengeDate', today);

        // Mettre a jour le streak
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

        // XP total
        const totalXP = await AsyncStorage.getItem('totalXP');
        const newTotal = (totalXP ? parseInt(totalXP) : 0) + xp;
        await AsyncStorage.setItem('totalXP', String(newTotal));

        // Sauvegarder vies
        await AsyncStorage.setItem('lives', String(lives));
      }
    }, 1500);
  };

  if (noSurahs) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Pas encore de sourates</Text>
          <Text style={styles.emptyText}>
            Commence par apprendre une sourate dans l'onglet "Sourates" pour debloquer le challenge quotidien.
          </Text>
        </View>
      </View>
    );
  }

  if (challengeDone && questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.doneContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          <Text style={styles.doneTitle}>Challenge du jour termine !</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={24} color="#F97316" />
            <Text style={styles.streakText}>{streak} jours</Text>
          </View>
          <Text style={styles.doneSubtitle}>Reviens demain pour continuer ton streak</Text>
        </View>
      </View>
    );
  }

  if (challengeDone) {
    return (
      <View style={styles.container}>
        <View style={styles.doneContainer}>
          <Ionicons name="trophy" size={80} color="#FBBF24" />
          <Text style={styles.doneTitle}>Challenge termine !</Text>
          <Text style={styles.scoreText}>{score}/5 bonnes reponses</Text>
          <Text style={styles.xpText}>+{xpEarned} XP</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={24} color="#F97316" />
            <Text style={styles.streakText}>{streak} jours</Text>
          </View>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const question = questions[currentIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.livesContainer}>
            <Ionicons name="heart" size={20} color="#EF4444" />
            <Text style={styles.livesText}>{lives}</Text>
          </View>
          <Text style={styles.questionCount}>{currentIndex + 1}/{questions.length}</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={18} color="#F97316" />
            <Text style={styles.streakSmall}>{streak}</Text>
          </View>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.questionType}>{question.questionText}</Text>
      {question.questionArabic && (
        <View style={styles.arabicContainer}>
          <Text style={styles.arabicText}>{question.questionArabic}</Text>
        </View>
      )}

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          let optionStyle = styles.option;
          if (answered) {
            if (index === question.correctIndex) {
              optionStyle = { ...styles.option, ...styles.optionCorrect };
            } else if (index === selectedIndex && index !== question.correctIndex) {
              optionStyle = { ...styles.option, ...styles.optionWrong };
            }
          }

          return (
            <TouchableOpacity
              key={index}
              style={[styles.option, answered && index === question.correctIndex && styles.optionCorrect, answered && index === selectedIndex && index !== question.correctIndex && styles.optionWrong]}
              onPress={() => handleAnswer(index)}
              disabled={answered}
            >
              <Text style={[styles.optionText, answered && index === question.correctIndex && styles.optionTextCorrect]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1B4332', borderRadius: 4 },
  headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  livesContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  livesText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  questionCount: { fontSize: 14, color: '#6B7280' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakSmall: { fontSize: 14, fontWeight: 'bold', color: '#F97316' },
  streakText: { fontSize: 18, fontWeight: 'bold', color: '#F97316' },
  questionType: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 16, textAlign: 'center' },
  arabicContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  arabicText: { fontSize: 24, lineHeight: 44, textAlign: 'right', color: '#111827', fontFamily: undefined },
  optionsContainer: { gap: 12 },
  option: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB' },
  optionCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  optionText: { fontSize: 16, color: '#374151', textAlign: 'right', lineHeight: 28 },
  optionTextCorrect: { color: '#065F46', fontWeight: '600' },
  loadingText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 40 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16 },
  doneSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  scoreText: { fontSize: 18, color: '#374151', marginTop: 8 },
  xpText: { fontSize: 20, fontWeight: 'bold', color: '#1B4332', marginTop: 4 },
});
