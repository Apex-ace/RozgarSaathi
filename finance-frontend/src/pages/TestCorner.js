// TestCorner.js

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';
import { toast } from 'react-hot-toast';
import {
  BookOpen, CheckCircle, XCircle, Landmark, CreditCard,
  PieChart, TrendingUp, ArrowLeft, RefreshCw,
  ChevronLeft, ChevronRight, Zap, Target
} from 'lucide-react';

function TestCorner() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Adaptive Test Recommendation
  const [adaptiveRecommendation, setAdaptiveRecommendation] = useState(null);
  const [predictionLoaded, setPredictionLoaded] = useState(false);

  // --- 1. FINANCE QUIZ CONFIGURATION ---
  const subjects = [
    {
      id: 'budgeting',
      name: 'Budgeting Basics',
      test_type: 'Budgeting & Saving',
      icon: <PieChart size={28} />,
      color: '#0D9488',
      bg: '#FFFFFF',
      border: '#E2E8F0'
    },
    {
      id: 'investing',
      name: 'Investing 101',
      test_type: 'Investing and Markets',
      icon: <TrendingUp size={28} />,
      color: '#2563EB',
      bg: '#FFFFFF',
      border: '#E2E8F0'
    },
    {
      id: 'debt',
      name: 'Debt Management',
      test_type: 'Credit Cards and Loans',
      icon: <CreditCard size={28} />,
      color: '#DC2626',
      bg: '#FFFFFF',
      border: '#E2E8F0'
    },
    {
      id: 'taxes',
      name: 'Tax Essentials',
      test_type: 'Income Taxes',
      icon: <Landmark size={28} />,
      color: '#B45309',
      bg: '#FFFFFF',
      border: '#E2E8F0'
    }
  ];

  // --- 2. ADAPTIVE LOGIC (Based on Financial Health) ---
  const calculateAdaptiveTest = (prediction) => {
    if (!prediction) return null;

    const { risk_level, savings_potential } = prediction;

    // High Risk or Negative Savings
    if (risk_level === 'High' || savings_potential <= 0) {
      return {
        subjectName: 'Debt & Budget Rescue',
        test_type: 'Debt Management and Basic Budgeting',
        difficulty: 'Easy',
        context: 'User has high financial risk. Focus on urgent debt reduction, avoiding bad credit, and survival budgeting.',
        reason:
          "We noticed indicators of higher risk. Let's focus on core budgeting and debt fundamentals to stabilize your finances."
      };
    }

    // Medium Risk
    if (risk_level === 'Medium') {
      return {
        subjectName: 'Savings Accelerator',
        test_type: 'Budgeting and Smart Saving Strategies',
        difficulty: 'Medium',
        context: 'User has moderate financial risk. Focus on optimizing savings rates, emergency funds, and basic compound interest.',
        reason:
          "You have a solid base. This module helps you increase savings efficiency and build stronger financial buffers."
      };
    }

    // Low Risk (Healthy)
    return {
      subjectName: 'Wealth Builder Pro',
      test_type: 'Advanced Investing, Assets, and Market Strategies',
      difficulty: 'Hard',
      context: 'User is financially healthy and has good savings. Focus on advanced investing, asset allocation, and wealth growth.',
      reason:
        "Your profile looks healthy. This advanced module focuses on investing, allocation, and long-term wealth building."
    };
  };

  // --- 3. SUPABASE FETCH EFFECT ---
  useEffect(() => {
    const fetchPredictionHistory = async () => {
      setPredictionLoaded(false);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch the latest financial health check
        const { data, error } = await supabase
          .from('financial_progress')
          .select('risk_level, savings_potential')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching prediction history:", error);
          toast.error("Could not load past performance data.");
        } else if (data) {
          setAdaptiveRecommendation(calculateAdaptiveTest(data));
        }
      }
      setPredictionLoaded(true);
    };

    fetchPredictionHistory();
  }, []);

  // --- 4. TEST GENERATION (SECURE API CALL) ---
  const generateTest = async (subject, difficultyOverride = null, contextOverride = null) => {
    setLoading(true);
    setQuestions([]);
    setScore(null);
    setAnswers({});
    setIsSubmitted(false);
    setActiveSubject(subject.name || subject.subjectName);
    setCurrentIndex(0);

    const difficulty = difficultyOverride || "Medium";
    const context = contextOverride || "General Adult Financial Literacy";

    const loadingToast = toast.loading(`Preparing ${subject.name || subject.subjectName}...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required.");

      const res = await fetch(`${API_BASE_URL}/generate_full_test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // Secure Backend Call
        },
        body: JSON.stringify({
          difficulty: difficulty,
          test_type: subject.test_type,
          learning_context: context
        })
      });

      if (!res.ok) throw new Error("Failed to connect to AI Test Generator.");

      const data = await res.json();
      let parsedQuestions = data.questions || (Array.isArray(data) ? data : []);
      if (!parsedQuestions.length) throw new Error("No questions returned.");

      setQuestions(parsedQuestions);
      toast.dismiss(loadingToast);
      toast.success(`Module started`);

    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error(`Error: Could not generate test. Check connection.`);
    } finally {
      setLoading(false);
    }
  };

  const submitTest = () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error(`Please answer all questions first!`);
      return;
    }

    let newScore = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correct_answer) newScore++;
    });
    setScore(newScore);
    setIsSubmitted(true);
    setCurrentIndex(0);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (newScore > questions.length / 2) toast.success(`Score: ${newScore}/${questions.length}`);
    else toast("Review the incorrect answers and try again.");
  };

  const handleNext = () => { if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  // Styling Helpers
  const getButtonColor = (option) => {
    const currentQ = questions[currentIndex];
    const isSelected = answers[currentIndex] === option;

    if (!isSubmitted) return isSelected ? 'rgba(13,148,136,0.08)' : 'white';

    if (option === currentQ.correct_answer) return 'rgba(13,148,136,0.12)';
    if (isSelected && option !== currentQ.correct_answer) return 'rgba(220,38,38,0.10)';
    return '#F8FAFC';
  };

  const getButtonBorder = (option) => {
    const currentQ = questions[currentIndex];
    const isSelected = answers[currentIndex] === option;

    if (!isSubmitted) return isSelected ? '1px solid #0D9488' : '1px solid #CBD5E1';

    if (option === currentQ.correct_answer) return '1px solid #0D9488';
    if (isSelected && option !== currentQ.correct_answer) return '1px solid #DC2626';
    return '1px solid #CBD5E1';
  };

  const currentQ = questions[currentIndex];

  const ui = {
    shell: {
      minHeight: '100vh',
      background:
        'radial-gradient(1000px 500px at 20% 0%, rgba(13,148,136,0.10), transparent 55%), radial-gradient(900px 600px at 90% 20%, rgba(37,99,235,0.10), transparent 55%), #F6F7FB',
      fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: '#0F172A',
      padding: '18px 14px 60px',
      boxSizing: 'border-box'
    },
    container: {
      maxWidth: '980px',
      margin: '0 auto',
    },
    headerBlock: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: '18px 18px',
      boxShadow: '0 10px 26px rgba(15, 23, 42, 0.08)',
      marginBottom: 16,
    },
    h1: {
      margin: 0,
      fontSize: '1.45rem',
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      color: '#0F172A'
    },
    p: { margin: '8px 0 0', color: '#64748B', fontWeight: 600, lineHeight: 1.45 },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 14,
      marginTop: 12
    },
    topicCard: (accent) => ({
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 16,
      padding: 16,
      cursor: 'pointer',
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
    }),
    topicAccentBar: (accent) => ({
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      background: accent,
    }),
    topicIcon: (accent) => ({
      width: 44,
      height: 44,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15,23,42,0.03)',
      color: accent,
      border: '1px solid rgba(15,23,42,0.06)',
      flexShrink: 0,
    }),
    topicTitle: { margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' },
    topicMeta: { margin: '4px 0 0', fontSize: '0.9rem', color: '#64748B', fontWeight: 700 },
    banner: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 16,
      boxShadow: '0 10px 26px rgba(15, 23, 42, 0.08)',
      marginBottom: 14,
    },
    bannerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
    chip: {
      background: 'rgba(13,148,136,0.10)',
      color: '#0F766E',
      border: '1px solid rgba(13,148,136,0.22)',
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: '0.82rem',
      fontWeight: 900,
      whiteSpace: 'nowrap'
    },
    primaryBtn: (disabled) => ({
      width: '100%',
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid transparent',
      background: disabled ? '#94A3B8' : '#0D9488',
      color: 'white',
      fontWeight: 900,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      boxShadow: disabled ? 'none' : '0 10px 22px rgba(13,148,136,0.22)',
      transition: 'transform 120ms ease',
    }),
    loaderBox: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 18,
      textAlign: 'center',
      boxShadow: '0 10px 26px rgba(15, 23, 42, 0.08)',
      marginTop: 18,
    },
    qCard: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 16,
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.10)',
      minHeight: 420,
      display: 'flex',
      flexDirection: 'column'
    },
    topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 },
    linkBtn: {
      background: 'transparent',
      border: 'none',
      padding: 0,
      color: '#475569',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontWeight: 800
    },
    progress: { fontWeight: 900, color: '#0F766E', fontSize: '0.9rem' },
    scoreBox: (good) => ({
      background: good ? 'rgba(13,148,136,0.10)' : 'rgba(180,83,9,0.10)',
      border: `1px solid ${good ? 'rgba(13,148,136,0.30)' : 'rgba(180,83,9,0.30)'}`,
      borderRadius: 14,
      padding: 12,
      textAlign: 'center',
      marginBottom: 14
    }),
    qText: { fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', margin: '4px 0 12px', lineHeight: 1.5 },
    options: { display: 'grid', gap: 10, flex: 1 },
    optBtn: (bg, border, disabled, selected) => ({
      padding: '14px 14px',
      borderRadius: 14,
      border,
      backgroundColor: bg,
      color: '#0F172A',
      textAlign: 'left',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: '0.98rem',
      position: 'relative',
      transition: 'all 120ms ease',
      fontWeight: selected ? 800 : 600,
    }),
    wrongBox: {
      marginTop: 12,
      padding: 12,
      background: 'rgba(220,38,38,0.08)',
      borderRadius: 12,
      border: '1px solid rgba(220,38,38,0.20)',
      color: '#7F1D1D',
      fontWeight: 700
    },
    nav: { marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
    ghostBtn: (disabled) => ({
      padding: '10px 14px',
      borderRadius: 12,
      border: '1px solid #CBD5E1',
      background: disabled ? '#F8FAFC' : '#FFFFFF',
      color: disabled ? '#94A3B8' : '#0F172A',
      cursor: disabled ? 'default' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 900
    }),
    darkBtn: {
      padding: '10px 14px',
      borderRadius: 12,
      border: '1px solid #0F172A',
      background: '#0F172A',
      color: '#FFFFFF',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 900
    }
  };

  return (
    <div style={ui.shell}>
      <div style={ui.container}>
        {!questions.length && (
          <div style={ui.headerBlock}>
            <h1 style={ui.h1}>
              <BookOpen size={24} color="#0D9488" /> Learning Center
            </h1>
            <p style={ui.p}>Choose a module to test your financial knowledge.</p>
          </div>
        )}

        {!predictionLoaded && !questions.length && (
          <div style={ui.loaderBox}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
              Loading your recent profile…
            </h2>
            <p style={{ margin: '8px 0 0', color: '#64748B', fontWeight: 600 }}>
              Fetching your latest health check details.
            </p>
          </div>
        )}

        {predictionLoaded && !questions.length && !loading && adaptiveRecommendation && (
          <div style={ui.banner}>
            <div style={ui.bannerTop}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.05rem', fontWeight: 900 }}>
                <Target size={20} color="#0D9488" /> Personalized Module
              </h3>
              <span style={ui.chip}>{adaptiveRecommendation.difficulty} Mode</span>
            </div>

            <p style={{ margin: '0 0 12px', color: '#475569', fontWeight: 650, lineHeight: 1.45 }}>
              {adaptiveRecommendation.reason}
            </p>

            <button
              onClick={() => generateTest(adaptiveRecommendation, adaptiveRecommendation.difficulty, adaptiveRecommendation.context)}
              style={ui.primaryBtn(false)}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Zap size={18} /> Start: {adaptiveRecommendation.subjectName}
            </button>
          </div>
        )}

        {predictionLoaded && !questions.length && !loading && (
          <div style={ui.grid}>
            {!adaptiveRecommendation && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: 14,
                  color: '#475569',
                  fontWeight: 650,
                  boxShadow: '0 8px 18px rgba(15,23,42,0.06)'
                }}
              >
                Run a <strong>Health Check</strong> to unlock AI-personalized recommendations.
              </div>
            )}

            {subjects.map((sub) => (
              <div
                key={sub.id}
                onClick={() => generateTest(sub, "Medium")}
                style={ui.topicCard(sub.color)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={ui.topicAccentBar(sub.color)} />
                <div style={ui.topicIcon(sub.color)}>{sub.icon}</div>
                <div>
                  <h3 style={ui.topicTitle}>{sub.name}</h3>
                  <div style={ui.topicMeta}>Start quiz</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={ui.loaderBox}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
              Preparing {activeSubject}…
            </h2>
            <p style={{ margin: '8px 0 0', color: '#64748B', fontWeight: 600 }}>
              Generating questions and answers.
            </p>
          </div>
        )}

        {questions.length > 0 && currentQ && (
          <div style={ui.qCard}>
            <div style={ui.topbar}>
              <button
                onClick={() => { setQuestions([]); setScore(null); }}
                style={ui.linkBtn}
              >
                <ArrowLeft size={18} /> Back
              </button>
              <span style={ui.progress}>
                Question {currentIndex + 1} / {questions.length}
              </span>
            </div>

            {isSubmitted && (
              <div style={ui.scoreBox(score > questions.length / 2)}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 950, color: '#0F172A' }}>
                  Score: {score} / {questions.length}
                </h2>
                <p style={{ margin: '6px 0 0', color: '#64748B', fontWeight: 650, fontSize: '0.92rem' }}>
                  Review answers and reattempt if needed.
                </p>
              </div>
            )}

            <h3 style={ui.qText}>{currentQ.question}</h3>

            <div style={ui.options}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  disabled={isSubmitted}
                  onClick={() => setAnswers({ ...answers, [currentIndex]: opt })}
                  style={ui.optBtn(
                    getButtonColor(opt),
                    getButtonBorder(opt),
                    isSubmitted,
                    answers[currentIndex] === opt
                  )}
                >
                  {opt}
                  {isSubmitted && opt === currentQ.correct_answer && (
                    <CheckCircle size={18} color="#0D9488" style={{ position: 'absolute', right: 12, top: 14 }} />
                  )}
                  {isSubmitted && answers[currentIndex] === opt && answers[currentIndex] !== currentQ.correct_answer && (
                    <XCircle size={18} color="#DC2626" style={{ position: 'absolute', right: 12, top: 14 }} />
                  )}
                </button>
              ))}
            </div>

            {isSubmitted && answers[currentIndex] !== currentQ.correct_answer && (
              <div style={ui.wrongBox}>
                <strong>Correct Answer:</strong> {currentQ.correct_answer}
              </div>
            )}

            <div style={ui.nav}>
              <button onClick={handlePrev} disabled={currentIndex === 0} style={ui.ghostBtn(currentIndex === 0)}>
                <ChevronLeft size={18} /> Prev
              </button>

              {currentIndex === questions.length - 1 ? (
                !isSubmitted ? (
                  <button onClick={submitTest} style={ui.primaryBtn(false)}>
                    Submit <CheckCircle size={18} />
                  </button>
                ) : (
                  <button onClick={() => { setQuestions([]); setScore(null); }} style={ui.darkBtn}>
                    <RefreshCw size={18} /> New Quiz
                  </button>
                )
              ) : (
                <button onClick={handleNext} style={ui.primaryBtn(false)}>
                  Next <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestCorner;