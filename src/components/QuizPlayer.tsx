'use client';

import { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
  onLoseLife?: () => void;
  lives: number;
}

export default function QuizPlayer({ questions, onComplete, onLoseLife, lives }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const question = questions[currentIndex];
  if (!question) return null;

  const handleAnswer = (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);

    const correct = optionIndex === question.correctIndex;
    if (correct) {
      setScore(prev => prev + 1);
    } else {
      onLoseLife?.();
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedIndex(null);
      } else {
        onComplete(correct ? score + 1 : score, questions.length);
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
        <span className="text-green-600 font-semibold">{score} correct</span>
      </div>

      {/* Question */}
      <h2 className="text-lg font-semibold text-center mb-4">{question.questionText}</h2>

      {question.questionArabic && (
        <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200">
          <p className="text-2xl leading-[48px] text-right" dir="rtl">
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
              <span className="text-base leading-7">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
