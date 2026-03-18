import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getSurah } from '../../lib/quran';
import { generateQuizForSurah } from '../../lib/quiz-generator';
import { calculateQuestionXP, calculateSurahMasteredXP } from '../../lib/scoring';
import { QuizQuestion } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    const q = generateQuizForSurah(surahNumber, 10);
    setQuestions(q);
    setStartTime(Date.now());

    // Charger les vies
    AsyncStorage.getItem('lives').then(val => {
      setLives(val ? parseInt(val) : 5);
    });
  }, [surahNumber]);

  const handleAnswer = async (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);

    const question = questions[currentIndex];
    const correct = optionIndex === question.correctIndex;
    const responseTime = Date.now() - startTime;

    if (correct) {
      const xp = calculateQuestionXP(true, responseTime);
      setScore(prev => prev + 1);
      setTotalXPEarned(prev => prev + xp);
    } else {
      const newLives = Math.max(0, lives - 1);
      setLives(newLives);
      await AsyncStorage.setItem('lives', String(newLives));

      if (newLives === 0) {
        setTimeout(() => {
          Alert.alert(
            'Plus de vies',
            'Tu n\'as plus de vies. Elles se regenerent en 1 heure.',
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
      } else {
        finishQuiz(correct ? score + 1 : score);
      }
    }, 1500);
  };

  const finishQuiz = async (finalScore: number) => {
    setQuizDone(true);

    const percentage = (finalScore / questions.length) * 100;
    let xpTotal = totalXPEarned;

    try {
      const stored = await AsyncStorage.getItem('surahProgress');
      const progress: Record<string, string> = stored ? JSON.parse(stored) : {};

      if (percentage >= 80) {
        // Sourate maitrisee
        progress[String(surahNumber)] = 'mastered';
        const streakStr = await AsyncStorage.getItem('streak');
        const streak = streakStr ? parseInt(streakStr) : 0;
        const masteryXP = calculateSurahMasteredXP(streak);
        xpTotal += masteryXP;
      } else {
        progress[String(surahNumber)] = 'learning';
      }

      await AsyncStorage.setItem('surahProgress', JSON.stringify(progress));

      // Mettre a jour XP total
      const currentXP = await AsyncStorage.getItem('totalXP');
      const newTotal = (currentXP ? parseInt(currentXP) : 0) + xpTotal;
      await AsyncStorage.setItem('totalXP', String(newTotal));

      // Mettre a jour review date
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

  if (quizDone) {
    const percentage = Math.round((score / questions.length) * 100);
    const mastered = percentage >= 80;

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: `Quiz - ${surah.nameFrench}` }} />
        <View style={styles.resultContainer}>
          <Ionicons
            name={mastered ? 'checkmark-circle' : 'close-circle'}
            size={80}
            color={mastered ? '#10B981' : '#F97316'}
          />
          <Text style={styles.resultTitle}>
            {mastered ? 'Sourate maitrisee !' : 'Continue a reviser'}
          </Text>
          <Text style={styles.resultScore}>{score}/{questions.length} ({percentage}%)</Text>
          {!mastered && (
            <Text style={styles.resultHint}>Il faut 80% pour maitriser la sourate</Text>
          )}
          <Text style={styles.resultXP}>+{totalXPEarned} XP</Text>

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
              }}
            >
              <Text style={styles.retryText}>Recommencer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement du quiz...</Text>
      </View>
    );
  }

  const question = questions[currentIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Quiz - ${surah.nameFrench}` }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.livesContainer}>
            <Ionicons name="heart" size={18} color="#EF4444" />
            <Text style={styles.livesText}>{lives}</Text>
          </View>
          <Text style={styles.questionCount}>{currentIndex + 1}/{questions.length}</Text>
          <Text style={styles.scoreDisplay}>{score} correct</Text>
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
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.option,
              answered && index === question.correctIndex && styles.optionCorrect,
              answered && index === selectedIndex && index !== question.correctIndex && styles.optionWrong,
            ]}
            onPress={() => handleAnswer(index)}
            disabled={answered}
          >
            <Text style={[
              styles.optionText,
              answered && index === question.correctIndex && styles.optionTextCorrect,
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
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
  scoreDisplay: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  questionType: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 16, textAlign: 'center' },
  arabicContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  arabicText: { fontSize: 24, lineHeight: 44, textAlign: 'right', color: '#111827' },
  optionsContainer: { gap: 12 },
  option: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB' },
  optionCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  optionText: { fontSize: 16, color: '#374151', textAlign: 'right', lineHeight: 28 },
  optionTextCorrect: { color: '#065F46', fontWeight: '600' },
  loadingText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 40 },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  resultTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16 },
  resultScore: { fontSize: 18, color: '#374151', marginTop: 8 },
  resultHint: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  resultXP: { fontSize: 22, fontWeight: 'bold', color: '#1B4332', marginTop: 12 },
  resultButtons: { flexDirection: 'row', gap: 12, marginTop: 32 },
  retryButton: { backgroundColor: '#1B4332', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  backButton: { backgroundColor: '#E5E7EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backText: { color: '#374151', fontWeight: '600', fontSize: 16 },
});
