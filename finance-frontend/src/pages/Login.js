import React, { useState } from "react";
import { supabase } from "../supabase";
import { toast } from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error;

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      error = signUpError;
      if (!error) toast.success("Account created successfully!");
    } else {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      error = signInError;
    }

    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">

        {/* LEFT SIDE */}
        <div className="md:w-1/2 bg-teal-50 p-10 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-slate-900">
            Expense Tracker
          </h1>
          <p className="mt-4 text-slate-600">
            Manage expenses, savings, and financial goals with clarity.
          </p>

          <ul className="mt-8 space-y-3 text-slate-700 text-sm hidden md:block">
            <li>✔ Smart expense tracking</li>
            <li>✔ Savings goal monitoring</li>
            <li>✔ Secure cloud storage</li>
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <div className="md:w-1/2 p-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-60"
            >
              {loading
                ? "Processing..."
                : isSignUp
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-600">
            {isSignUp
              ? "Already have an account?"
              : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-teal-600 font-semibold hover:underline"
            >
              {isSignUp ? "Sign In" : "Create Account"}
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            🔒 Your data is encrypted and secure. Never share your password.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;