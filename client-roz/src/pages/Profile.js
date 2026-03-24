import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Edit3, Save, Target, Briefcase, PiggyBank,
  Zap, TrendingUp, ShieldCheck, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Display State
  const [profile, setProfile] = useState({
    name: '', financial_goal: '', occupation: '', risk_appetite: ''
  });

  // Form State (for the popup modal)
  const [formData, setFormData] = useState({
    name: '', financial_goal: '', occupation: '', risk_appetite: ''
  });

  const [stats, setStats] = useState({
    totalCheckups: 0, avgSavings: 0, latestHealth: 'N/A', level: 1
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('financial_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
          setProfile(profileData);
      }

      // Fetch History for Stats
      const { data: historyData } = await supabase
        .from('financial_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (historyData && historyData.length > 0) {
        const savings = historyData.map(h => h.savings_potential || 0);
        const total = savings.reduce((a, b) => a + b, 0);
        const avg = total / savings.length;
        const latest = historyData[historyData.length - 1];

        setStats({
          totalCheckups: historyData.length,
          avgSavings: Math.round(avg),
          latestHealth: latest.financial_health || 'N/A',
          level: Math.floor(historyData.length / 2) + 1
        });
      }
    }
    setLoading(false);
  };

  const openEditModal = () => {
      setFormData(profile); // Load current data into the form
      setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('financial_profile')
        .upsert({
          user_id: user.id,
          name: formData.name,
          financial_goal: formData.financial_goal,
          occupation: formData.occupation,
          risk_appetite: formData.risk_appetite
        }, { onConflict: 'user_id' });

      if (!error) {
          setProfile(formData); // Update UI
          setShowModal(false);  // Close Modal
          toast.success("Profile updated successfully!");
      } else {
          toast.error("Failed to save profile.");
      }
    }
    setSaving(false);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const getAvatar = (name) => {
    const avatars = ['💎', '🤑', '🐂', '🦉', '🦅', '🦁', '🚀', '🏦'];
    if (!name) return '👤';
    const charSum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return avatars[charSum % avatars.length];
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '50px' }}>
        <h2 style={{color: '#047857'}}>Loading Profile... 🏦</h2>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '50px' }}>
      
      {/* HEADER CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #D1FAE5', borderRadius: '25px', marginBottom: '25px' }}>
        <div style={{ height: '140px', background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)', position: 'relative' }}>
          <button onClick={openEditModal} style={{
              position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', 
              color: '#047857', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', 
              fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <Edit3 size={16}/> Edit Profile
          </button>
        </div>

        <div style={{ padding: '0 25px 30px', textAlign: 'center', marginTop: '-60px' }}>
          
          {/* FIX: Added position: 'relative' here so zIndex works and it pops out in front of the banner */}
          <div style={{
              width: '120px', height: '120px', borderRadius: '50%', background: '#FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem',
              margin: '0 auto', border: '6px solid white', boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              position: 'relative', zIndex: 10 
          }}>
            {getAvatar(profile.name)}
          </div>
          
          <h1 style={{ marginTop: '15px', marginBottom: '5px', fontSize: '2.2rem', color: '#1F2937', fontWeight: '800' }}>
            {profile.name || "Investor"}
          </h1>
          <p style={{ color: '#64748B', fontSize: '1.1rem', marginTop: 0, fontWeight: '600' }}>
            {profile.occupation || "Building Wealth"}
          </p>

          {/* STATS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '25px' }}>
            <StatCard label="Wealth Level" value={stats.level} icon={<Zap size={24} color="#F59E0B" />} />
            <StatCard label="Latest Health" value={stats.latestHealth} icon={<ShieldCheck size={24} color="#10B981" />} />
            <StatCard label="Avg. Savings" value={`$${stats.avgSavings}`} icon={<TrendingUp size={24} color="#3B82F6" />} />
          </div>
        </div>
      </div>

      {/* DETAILS CARD */}
      <div className="card" style={{ border: '2px solid #E5E7EB', borderRadius: '25px', padding: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px', color: '#374151', fontSize: '1.4rem' }}>
          <Target size={24} color="#10B981"/> Financial Compass
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <InfoPill icon={<Target size={20} color="#2563EB"/>} label="Primary Goal" text={profile.financial_goal || "No goal set yet."} bg="#EFF6FF" border="#DBEAFE" />
          <InfoPill icon={<PiggyBank size={20} color="#DC2626"/>} label="Risk Appetite" text={profile.risk_appetite || "Not evaluated."} bg="#FEF2F2" border="#FECACA" />
        </div>
      </div>

      {/* --- EDIT PROFILE MODAL (POPUP) --- */}
      {showModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '20px', boxSizing: 'border-box'
        }}>
            <div style={{
                background: 'white', width: '100%', maxWidth: '500px', borderRadius: '25px',
                padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                position: 'relative', animation: 'fadeUp 0.3s ease-out'
            }}>
                <button onClick={() => setShowModal(false)} style={{
                    position: 'absolute', top: '20px', right: '20px', background: '#F1F5F9',
                    border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B'
                }}>
                    <X size={20} />
                </button>

                <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#047857', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Edit3 size={24} /> Edit Profile
                </h2>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Full Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. John Doe" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Occupation</label>
                        <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="e.g. Software Engineer" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Primary Financial Goal</label>
                        <input name="financial_goal" value={formData.financial_goal} onChange={handleChange} placeholder="e.g. Buy a house, Retire early" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Risk Appetite</label>
                        <select name="risk_appetite" value={formData.risk_appetite} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', outline: 'none', background: 'white' }}>
                            <option value="">Select risk level...</option>
                            <option value="Conservative">Conservative (Low Risk)</option>
                            <option value="Moderate">Moderate (Medium Risk)</option>
                            <option value="Aggressive">Aggressive (High Risk)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#F1F5F9', border: 'none', color: '#4B5563', fontWeight: 'bold', cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 2, margin: 0 }}>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

/* ---------- Small UI Components ---------- */

const StatCard = ({label, value, icon}) => (
  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '20px', border: '2px solid #F1F5F9', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>{icon}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1F2937' }}>{value}</div>
    <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '5px' }}>{label}</div>
  </div>
);

const InfoPill = ({icon, label, text, bg, border}) => (
  <div style={{ background: bg, padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', border: `2px solid ${border}` }}>
    <div style={{ background: 'white', padding: '10px', borderRadius: '50%', display: 'flex', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        {icon}
    </div>
    <div>
        <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '1.1rem', color: '#1F2937', fontWeight: '600' }}>{text}</div>
    </div>
  </div>
);

export default Profile;