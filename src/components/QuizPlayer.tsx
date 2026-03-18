'use client';

import { useState, useRef } from 'react';
import { QuizQuestion } from '../types';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number, totalPoints: number) => void;
  onLoseLife?: () => void;
  lives: number;
}

// Score pondere : max 100 points par question
// Bonne reponse < 2s = 100 pts
// Bonne reponse < 4s = 80 pts
// Bonne reponse < 7s = 60 pts
// Bonne reponse < 12s = 40 pts
// Bonne reponse >= 12s = 20 pts
// Mauvaise reponse = 0 pts
function getPointsForAnswer(correct: boolean, responseTimeMs: number): number {
  if (!correct) return 0;
  if (responseTimeMs < 2000) return 100;
  if (responseTimeMs < 4000) return 80;
  if (responseTimeMs < 7000) return 60;
  if (responseTimeMs < 12000) return 40;
  return 20;
}

export default function QuizPlayer({ questions, onComplete, onLoseLife, lives }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const questionStartTime = useRef(Date.now());

  const question = questions[currentIndex];
  if (!question) return null;

  const handleAnswer = (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);

    const responseTime = Date.now() - questionStartTime.current;
    const correct = optionIndex === question.correctIndex;
    const points = getPointsForAnswer(correct, responseTime);
    setLastPoints(points);

    if (correct) {
      setScore(prev => prev + 1);
      setTotalPoints(prev => prev + points);
    } else {
      onLoseLife?.();
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedIndex(null);
        setLastPoints(null);
        questionStartTime.current = Date.now();
      } else {
        const finalScore = correct ? score + 1 : score;
        const finalPoints = correct ? totalPoints + points : totalPoints;
        onComplete(finalScore, questions.length, finalPoints);
      }
    }, 1200);
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="p-4">
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[#1B4332] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header info */}
      <div className="flex justify-between items-center mb-6 text-sm">
        <div className="flex items-center gap-1">
          <span>❤️</span>
          <span className="font-bold text-red-500">{lives}</span>
        </div>
        <span className="text-gray-500">{currentIndex + 1}/{questions.length}</span>
        <span className="text-green-600 font-semibold">{totalPoints} pts</span>
      </div>

      {/* Question */}
      <h2 className="text-lg font-semibold text-center mb-4">{question.questionText}</h2>

      {question.questionArabic && (
        <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200">
          <p
            className="text-2xl leading-[56px] text-right"
            dir="rtl"
            style={{ fontFamily: "'Amiri Quran', serif" }}
          >
            {question.questionArabic}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          let borderColor = 'border-gray-200';
          let bgColor = 'bg-white';
          if (answered) {
            if (index === question.correctIndex) {
              borderColor = 'border-green-500';
              bgColor = 'bg-green-50';
            } else if (index === selectedIndex) {
              borderColor = 'border-red-500';
              bgColor = 'bg-red-50';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={answered}
              className={`w-full text-right p-4 rounded-xl border-2 ${borderColor} ${bgColor} transition-all ${
                !answered ? 'hover:border-[#1B4332] active:scale-[0.98]' : ''
              }`}
              dir="rtl"
            >
              <span
                className="text-base leading-8"
                style={{ fontFamily: "'Amiri Quran', serif" }}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback points */}
      {answered && lastPoints !== null && (
        <div className="text-center mt-4">
          <span className={`text-lg font-bold ${lastPoints > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {lastPoints > 0 ? `+${lastPoints} pts` : '0 pts'}
          </span>
          {lastPoints >= 80 && <span className="text-sm text-gray-500 ml-2">Rapide !</span>}
        </div>
      )}
    </div>
  );
}
