import { useState, useRef, useEffect } from "react";
import {
  Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, MapPin, User,
  ShieldCheck, Siren, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";

/* ------------------------------------------------------------------
   ResQueAI SOS - Login page
   Methods: 1) Email + password   2) Registered mobile number + OTP

   Connect your backend by passing these props (each must return a
   Promise and throw an Error with a readable message on failure):
     onEmailLogin({ email, password, remember })
     onSendOtp(phone)            phone = 10 digit string
     onVerifyOtp(phone, otp)     otp   = 6 digit string
     onSuccess(result)           called after a successful login
     onRegister({ name, email, phone, password })
                                 create the account and text an OTP to phone
     onVerifyRegisterOtp(phone, otp)
                                 confirm the OTP and activate the account
     onRegisterSuccess(result)   called after the account is created
     (OTP resend on the register screen uses onSendOtp(phone))
     onForgotPassword()          "Forgot password" click

   The defaults below are DEMO ONLY. The demo OTP is 123456.
------------------------------------------------------------------- */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const demo = {
  onEmailLogin: async () => { await wait(900); return { demo: true }; },
  onSendOtp: async () => { await wait(800); },
  onVerifyOtp: async (_p, otp) => {
    await wait(800);
    if (otp !== "123456") throw new Error("That code is incorrect. Check the SMS and try again.");
    return { demo: true };
  },
  onRegister: async () => { await wait(1000); },
  onVerifyRegisterOtp: (p, o) => demo.onVerifyOtp(p, o),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const OTP_LEN = 6;
const RESEND_SECONDS = 30;

export default function Login({
  onEmailLogin = demo.onEmailLogin,
  onSendOtp = demo.onSendOtp,
  onVerifyOtp = demo.onVerifyOtp,
  onSuccess,
  onRegister = demo.onRegister,
  onVerifyRegisterOtp = demo.onVerifyRegisterOtp,
  onRegisterSuccess,
  onForgotPassword,
}) {
  const [mode, setMode] = useState("email"); // "email" | "phone"
  const [step, setStep] = useState("enter"); // phone flow: "enter" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [doneType, setDoneType] = useState("login"); // "login" | "register"
  const [view, setView] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const boxes = useRef([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const switchMode = (m) => {
    setMode(m);
    setStep("enter");
    setError("");
    setOtp(Array(OTP_LEN).fill(""));
  };

  const run = async (fn) => {
    setError("");
    setLoading(true);
    try {
      return { value: await fn() };
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const finish = (result) => {
    setDoneType("login");
    setDone(true);
    onSuccess?.(result);
  };

  const goView = (v) => {
    setView(v);
    setMode("email");
    setStep("enter");
    setError("");
    setDone(false);
    setDoneType("login");
    setPassword("");
    setConfirm("");
    setOtp(Array(OTP_LEN).fill(""));
  };

  const startOtp = () => {
    setStep("otp");
    setTimer(RESEND_SECONDS);
    setOtp(Array(OTP_LEN).fill(""));
    setTimeout(() => boxes.current[0]?.focus(), 50);
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (!PHONE_RE.test(phone)) return setError("Enter a valid 10-digit Indian mobile number.");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      return setError("Password needs at least 8 characters, with letters and a number.");
    if (password !== confirm) return setError("The two passwords do not match.");
    const ok = await run(async () => {
      await onRegister({ name: name.trim(), email: email.trim(), phone, password });
      return true;
    });
    if (ok) startOtp();
  };

  const resendRegisterOtp = async () => {
    const ok = await run(async () => { await onSendOtp(phone); return true; });
    if (ok) startOtp();
  };

  const verifyRegisterOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LEN) return setError(`Enter the ${OTP_LEN}-digit code.`);
    const res = await run(() => onVerifyRegisterOtp(phone, code));
    if (res) {
      setDoneType("register");
      setDone(true);
      onRegisterSuccess?.(res.value);
    }
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    const res = await run(() => onEmailLogin({ email: email.trim(), password, remember }));
    if (res) finish(res.value);
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (!PHONE_RE.test(phone)) return setError("Enter a valid 10-digit Indian mobile number.");
    const ok = await run(async () => { await onSendOtp(phone); return true; });
    if (ok) {
      setStep("otp");
      setTimer(RESEND_SECONDS);
      setOtp(Array(OTP_LEN).fill(""));
      setTimeout(() => boxes.current[0]?.focus(), 50);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LEN) return setError(`Enter the ${OTP_LEN}-digit code.`);
    const res = await run(() => onVerifyOtp(phone, code));
    if (res) finish(res.value);
  };

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setOtp((o) => o.map((x, idx) => (idx === i ? d : x)));
    if (d && i < OTP_LEN - 1) boxes.current[i + 1]?.focus();
  };

  const onKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LEN - 1) boxes.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!t) return;
    e.preventDefault();
    setOtp(Array.from({ length: OTP_LEN }, (_, i) => t[i] || ""));
    boxes.current[Math.min(t.length, OTP_LEN - 1)]?.focus();
  };

  const masked = phone ? `+91 ${phone.slice(0, 2)}XXX XX${phone.slice(-3)}` : "";

  return (
    <section className="rq-login">
      <style>{css}</style>
      <div className="rq-wrap">
        <aside className="rq-aside">
          <h1>{view === "register" ? "Set up your safety profile" : "Sign in to get help faster"}</h1>
          <p className="rq-lead">
            Your profile keeps your emergency contacts and location details ready, so they are one tap away when it matters.
          </p>
          <ul className="rq-feats">
            <li><span className="rq-ico"><MapPin size={20} /></span>Live location lookup</li>
            <li><span className="rq-ico"><User size={20} /></span>Emergency contact directory</li>
            <li><span className="rq-ico"><ShieldCheck size={20} /></span>Local authority numbers</li>
            <li><span className="rq-ico"><Siren size={20} /></span>Fast access to help information</li>
          </ul>
          <a className="rq-urgent" href="tel:112">
            <span className="rq-ico rq-ico-solid"><Phone size={18} /></span>
            <span>In immediate danger? <strong>Call 112</strong> without logging in.</span>
          </a>
        </aside>

        <main className="rq-card">
          {done ? (
            <div className="rq-done" role="status">
              <span className="rq-donecheck"><CheckCircle2 size={34} /></span>
              {doneType === "register" ? (
                <>
                  <h2>Account created</h2>
                  <p>Your mobile number is verified. You can log in now.</p>
                  <button type="button" className="rq-btn rq-mt" onClick={() => goView("login")}>Go to login</button>
                </>
              ) : (
                <>
                  <h2>You are signed in</h2>
                  <p>Taking you to your profile.</p>
                </>
              )}
            </div>
          ) : view === "register" ? (
            <>
              <div className="rq-head">
                <span className="rq-ico rq-ico-solid rq-ico-lg"><User size={24} /></span>
                <div>
                  <h2>Create your account</h2>
                  <p>Save your contacts and get help faster.</p>
                </div>
              </div>

              {error && (
                <div className="rq-error" role="alert">
                  <AlertCircle size={18} /> <span>{error}</span>
                </div>
              )}

              {step === "enter" ? (
                <form onSubmit={submitRegister} noValidate>
                  <label className="rq-label" htmlFor="rq-name">Full name</label>
                  <div className="rq-field">
                    <User size={19} />
                    <input id="rq-name" type="text" autoComplete="name" placeholder="Your full name"
                      value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <label className="rq-label" htmlFor="rq-remail">Email address</label>
                  <div className="rq-field">
                    <Mail size={19} />
                    <input id="rq-remail" type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <label className="rq-label" htmlFor="rq-rphone">Mobile number</label>
                  <div className="rq-field">
                    <Phone size={19} />
                    <span className="rq-cc">+91</span>
                    <input id="rq-rphone" type="tel" inputMode="numeric" autoComplete="tel-national"
                      placeholder="98765 43210" maxLength={10} value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                  </div>

                  <label className="rq-label" htmlFor="rq-rpw">Create password</label>
                  <div className="rq-field">
                    <Lock size={19} />
                    <input id="rq-rpw" type={showPw ? "text" : "password"} autoComplete="new-password"
                      placeholder="At least 8 characters" value={password}
                      onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="rq-eye" onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}>
                      {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>

                  <label className="rq-label" htmlFor="rq-rconfirm">Confirm password</label>
                  <div className="rq-field">
                    <Lock size={19} />
                    <input id="rq-rconfirm" type={showPw ? "text" : "password"} autoComplete="new-password"
                      placeholder="Type the password again" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} />
                  </div>

                  <p className="rq-hint">We will text a 6-digit code to verify your mobile number.</p>
                  <button className="rq-btn" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={19} className="rq-spin" /> Creating account</> : "Create account"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyRegisterOtp} noValidate>
                  <button type="button" className="rq-back"
                    onClick={() => { setStep("enter"); setError(""); }}>
                    <ArrowLeft size={17} /> Edit details
                  </button>
                  <p className="rq-otpmsg">Enter the code sent to <strong>{masked}</strong></p>
                  <div className="rq-otp" onPaste={onPaste}>
                    {otp.map((d, i) => (
                      <input key={i} ref={(el) => (boxes.current[i] = el)} value={d}
                        inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
                        onFocus={(e) => e.target.select()} />
                    ))}
                  </div>
                  <button className="rq-btn" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={19} className="rq-spin" /> Verifying</> : "Verify and create account"}
                  </button>
                  <p className="rq-resend">
                    {timer > 0 ? (
                      <>Resend code in 0:{String(timer).padStart(2, "0")}</>
                    ) : (
                      <>Did not get it? <button type="button" className="rq-link" onClick={resendRegisterOtp} disabled={loading}>Resend OTP</button></>
                    )}
                  </p>
                </form>
              )}

              <p className="rq-foot">
                Already have an account?{" "}
                <button type="button" className="rq-link" onClick={() => goView("login")}>Log in</button>
              </p>
            </>
          ) : (
            <>
              <div className="rq-head">
                <span className="rq-ico rq-ico-solid rq-ico-lg"><ShieldCheck size={24} /></span>
                <div>
                  <h2>Welcome back</h2>
                  <p>Log in to your ResQueAI account.</p>
                </div>
              </div>

              <div className="rq-tabs" role="tablist" aria-label="Login method">
                <button type="button" role="tab" aria-selected={mode === "email"}
                  className={mode === "email" ? "on" : ""} onClick={() => switchMode("email")}>
                  <Mail size={17} /> Email and password
                </button>
                <button type="button" role="tab" aria-selected={mode === "phone"}
                  className={mode === "phone" ? "on" : ""} onClick={() => switchMode("phone")}>
                  <Phone size={17} /> Mobile OTP
                </button>
              </div>

              {error && (
                <div className="rq-error" role="alert">
                  <AlertCircle size={18} /> <span>{error}</span>
                </div>
              )}

              {mode === "email" && (
                <form onSubmit={submitEmail} noValidate>
                  <label className="rq-label" htmlFor="rq-email">Email address</label>
                  <div className="rq-field">
                    <Mail size={19} />
                    <input id="rq-email" type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <label className="rq-label" htmlFor="rq-pw">Password</label>
                  <div className="rq-field">
                    <Lock size={19} />
                    <input id="rq-pw" type={showPw ? "text" : "password"} autoComplete="current-password"
                      placeholder="Enter your password" value={password}
                      onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="rq-eye" onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}>
                      {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>

                  <div className="rq-row">
                    <label className="rq-check">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                      Keep me signed in
                    </label>
                    <button type="button" className="rq-link" onClick={onForgotPassword}>Forgot password?</button>
                  </div>

                  <button className="rq-btn" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={19} className="rq-spin" /> Logging in</> : "Log in"}
                  </button>
                </form>
              )}

              {mode === "phone" && step === "enter" && (
                <form onSubmit={sendOtp} noValidate>
                  <label className="rq-label" htmlFor="rq-phone">Registered mobile number</label>
                  <div className="rq-field">
                    <Phone size={19} />
                    <span className="rq-cc">+91</span>
                    <input id="rq-phone" type="tel" inputMode="numeric" autoComplete="tel-national"
                      placeholder="98765 43210" maxLength={10} value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                  </div>
                  <p className="rq-hint">We will text a 6-digit code to the number linked to your account.</p>
                  <button className="rq-btn" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={19} className="rq-spin" /> Sending code</> : "Send OTP"}
                  </button>
                </form>
              )}

              {mode === "phone" && step === "otp" && (
                <form onSubmit={verifyOtp} noValidate>
                  <button type="button" className="rq-back"
                    onClick={() => { setStep("enter"); setError(""); }}>
                    <ArrowLeft size={17} /> Change number
                  </button>
                  <p className="rq-otpmsg">Enter the code sent to <strong>{masked}</strong></p>
                  <div className="rq-otp" onPaste={onPaste}>
                    {otp.map((d, i) => (
                      <input key={i} ref={(el) => (boxes.current[i] = el)} value={d}
                        inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
                        onFocus={(e) => e.target.select()} />
                    ))}
                  </div>
                  <button className="rq-btn" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={19} className="rq-spin" /> Verifying</> : "Verify and log in"}
                  </button>
                  <p className="rq-resend">
                    {timer > 0 ? (
                      <>Resend code in 0:{String(timer).padStart(2, "0")}</>
                    ) : (
                      <>Did not get it? <button type="button" className="rq-link" onClick={sendOtp} disabled={loading}>Resend OTP</button></>
                    )}
                  </p>
                </form>
              )}

              <p className="rq-foot">
                New to ResQueAI?{" "}
                <button type="button" className="rq-link" onClick={() => goView("register")}>Create an account</button>
              </p>
            </>
          )}
        </main>
      </div>
    </section>
  );
}

const css = `
.rq-login{
  --red:#e11d2e; --red-d:#c8102e; --tint:#fdecec; --navy:#0f1b3d; --muted:#6b7280;
  --bg:#fafbfd; --card:#ffffff; --field:#ffffff; --bd:#e6e9f0; --err-bg:#fff1f1; --err-bd:#f9c9cd;
  --shadow:0 24px 60px rgba(15,27,61,.09);
  font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--navy); box-sizing:border-box; min-height:calc(100vh - 80px);
  display:flex; align-items:center; justify-content:center; padding:40px 24px;
  background:
    radial-gradient(800px 420px at 90% -10%, rgba(225,29,46,.11), transparent 60%),
    radial-gradient(700px 420px at -10% 110%, rgba(225,29,46,.07), transparent 60%),
    var(--bg);
}
[data-theme="dark"] .rq-login, .dark .rq-login{
  --tint:rgba(225,29,46,.16); --navy:#f1f5f9; --muted:#9aa6bd; --bg:#0b1020; --card:#121a2e;
  --field:#0e1527; --bd:#25314d; --err-bg:rgba(225,29,46,.12); --err-bd:rgba(225,29,46,.4);
  --shadow:0 24px 60px rgba(0,0,0,.45);
}
.rq-login *{box-sizing:border-box}
.rq-wrap{width:100%; max-width:1060px; display:grid; grid-template-columns:1.05fr 1fr; gap:64px; align-items:center}

/* left panel */
.rq-aside h1{font-size:44px; line-height:1.1; font-weight:800; letter-spacing:-.02em; margin:0 0 16px; max-width:460px}
.rq-lead{color:var(--muted); font-size:16px; line-height:1.65; max-width:440px; margin:0 0 30px}
.rq-feats{list-style:none; padding:0; margin:0 0 30px; display:grid; gap:14px}
.rq-feats li{display:flex; align-items:center; gap:14px; font-weight:600; font-size:15px}
.rq-ico{width:44px; height:44px; border-radius:12px; background:var(--tint); color:var(--red); display:grid; place-items:center; flex:none; box-shadow:0 4px 12px rgba(225,29,46,.08)}
.rq-ico-solid{background:linear-gradient(180deg,#ef3340,var(--red-d)); color:#fff; box-shadow:0 8px 18px rgba(225,29,46,.3)}
.rq-ico-lg{width:52px; height:52px; border-radius:14px}
.rq-urgent{display:flex; align-items:center; gap:14px; max-width:440px; padding:12px 16px; border-radius:16px; background:var(--card); border:1px solid var(--bd); color:var(--muted); font-size:14px; line-height:1.4; text-decoration:none}
.rq-urgent strong{color:var(--red)}
.rq-urgent .rq-ico{width:38px; height:38px; border-radius:10px}
.rq-urgent:hover{border-color:var(--red)}

/* card */
.rq-card{background:var(--card); border:1px solid var(--bd); border-radius:24px; padding:36px; box-shadow:var(--shadow); width:100%; max-width:480px; justify-self:end}
.rq-head{display:flex; align-items:center; gap:16px; margin-bottom:24px}
.rq-head h2{margin:0; font-size:26px; font-weight:800; letter-spacing:-.01em}
.rq-head p{margin:4px 0 0; color:var(--muted); font-size:14px}

.rq-tabs{display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:5px; border-radius:16px; background:var(--bg); border:1px solid var(--bd); margin-bottom:22px}
.rq-tabs button{display:flex; align-items:center; justify-content:center; gap:8px; padding:11px 8px; border:0; border-radius:12px; background:transparent; color:var(--muted); font:600 14px/1 inherit; font-family:inherit; cursor:pointer; transition:background .15s,color .15s}
.rq-tabs button:hover{color:var(--navy)}
.rq-tabs button.on{background:var(--tint); color:var(--red)}

.rq-label{display:block; font-size:13px; font-weight:700; margin:16px 0 8px}
.rq-field{display:flex; align-items:center; gap:10px; height:52px; padding:0 14px; border-radius:14px; background:var(--field); border:1.5px solid var(--bd); color:var(--muted); transition:border-color .15s, box-shadow .15s}
.rq-field:focus-within{border-color:var(--red); box-shadow:0 0 0 4px rgba(225,29,46,.12); color:var(--red)}
.rq-field input{flex:1; min-width:0; height:100%; border:0; outline:0; background:transparent; color:var(--navy); font:500 15px inherit; font-family:inherit}
.rq-field input::placeholder{color:#9aa3b5}
.rq-cc{font-weight:700; font-size:15px; color:var(--navy); padding-right:10px; border-right:1.5px solid var(--bd)}
.rq-eye{border:0; background:none; color:var(--muted); cursor:pointer; display:grid; place-items:center; padding:4px; border-radius:8px}
.rq-eye:hover{color:var(--red)}

.rq-row{display:flex; align-items:center; justify-content:space-between; gap:12px; margin:16px 0 22px; font-size:14px}
.rq-check{display:flex; align-items:center; gap:8px; color:var(--muted); cursor:pointer}
.rq-check input{accent-color:var(--red); width:16px; height:16px}
.rq-hint{margin:10px 0 22px; font-size:13px; color:var(--muted); line-height:1.5}

.rq-link{border:0; background:none; padding:0; color:var(--red); font:700 inherit; font-family:inherit; font-size:inherit; cursor:pointer}
.rq-link:hover{text-decoration:underline}
.rq-link:disabled{opacity:.5; cursor:not-allowed}

.rq-btn{width:100%; height:54px; display:flex; align-items:center; justify-content:center; gap:10px; border:0; border-radius:14px; color:#fff; font:700 16px inherit; font-family:inherit; cursor:pointer; background:linear-gradient(180deg,#ef3340,var(--red-d)); box-shadow:0 10px 24px rgba(225,29,46,.3); transition:transform .12s, box-shadow .12s, opacity .12s}
.rq-btn:hover:not(:disabled){transform:translateY(-1px); box-shadow:0 14px 28px rgba(225,29,46,.36)}
.rq-btn:disabled{opacity:.75; cursor:progress}
.rq-mt{margin-top:22px}
.rq-spin{animation:rq-spin 1s linear infinite}
@keyframes rq-spin{to{transform:rotate(360deg)}}

.rq-error{display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:12px; background:var(--err-bg); border:1px solid var(--err-bd); color:var(--red-d); font-size:14px; font-weight:600; line-height:1.4; margin-bottom:6px}
.rq-error svg{flex:none; margin-top:1px}
[data-theme="dark"] .rq-error, .dark .rq-error{color:#ff8a93}

.rq-back{display:inline-flex; align-items:center; gap:6px; border:0; background:none; color:var(--muted); font:600 14px inherit; font-family:inherit; cursor:pointer; padding:0; margin:4px 0 14px}
.rq-back:hover{color:var(--red)}
.rq-otpmsg{margin:0 0 18px; font-size:15px; color:var(--muted); line-height:1.5}
.rq-otpmsg strong{color:var(--navy)}
.rq-otp{display:flex; gap:10px; margin-bottom:22px}
.rq-otp input{flex:1; min-width:0; height:58px; text-align:center; font:700 24px inherit; font-family:inherit; color:var(--navy); background:var(--field); border:1.5px solid var(--bd); border-radius:14px; outline:0; transition:border-color .15s, box-shadow .15s}
.rq-otp input:focus{border-color:var(--red); box-shadow:0 0 0 4px rgba(225,29,46,.12)}
.rq-resend{text-align:center; margin:16px 0 0; font-size:14px; color:var(--muted)}

.rq-foot{text-align:center; margin:26px 0 0; padding-top:20px; border-top:1px solid var(--bd); font-size:14px; color:var(--muted)}

.rq-done{text-align:center; padding:40px 0}
.rq-donecheck{width:72px; height:72px; border-radius:50%; background:var(--tint); color:var(--red); display:inline-grid; place-items:center; margin-bottom:18px}
.rq-done h2{margin:0 0 6px; font-size:24px; font-weight:800}
.rq-done p{margin:0; color:var(--muted)}

.rq-login :focus-visible{outline:3px solid rgba(225,29,46,.45); outline-offset:2px}
.rq-field input:focus-visible,.rq-otp input:focus-visible{outline:0}

@media (max-width:920px){
  .rq-wrap{grid-template-columns:1fr; gap:0; justify-items:center}
  .rq-aside{display:none}
  .rq-card{justify-self:center}
}
@media (max-width:480px){
  .rq-login{padding:24px 14px}
  .rq-card{padding:26px 20px; border-radius:20px}
  .rq-otp{gap:7px}
  .rq-otp input{height:52px; font-size:21px}
  .rq-tabs button{font-size:13px}
}
@media (prefers-reduced-motion:reduce){
  .rq-spin{animation:none}
  .rq-btn,.rq-field,.rq-otp input{transition:none}
}
`;