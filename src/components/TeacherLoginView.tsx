import React, { useState } from 'react';
import { Lock, User, ShieldCheck, XCircle, Eye, EyeOff } from 'lucide-react';
import type { ServerStateSnapshot } from '../types';

export interface TeacherProfile {
  id: string;
  name: string;
  username: string;
  phone: string;
}

interface TeacherLoginViewProps {
  onLoginSuccess: (
    token: string,
    teacher: TeacherProfile,
    initialState: ServerStateSnapshot,
    rememberMe?: boolean
  ) => void;
  onSwitchToStudentPortal: () => void;
}

export const TeacherLoginView: React.FC<TeacherLoginViewProps> = ({
  onLoginSuccess,
  onSwitchToStudentPortal,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'نام کاربری یا رمز عبور اشتباه است.');
      } else {
        onLoginSuccess(data.token, data.teacher, data.state, rememberMe);
      }
    } catch {
      setError('خطا در ارتباط با سرور احراز هویت استاد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto py-4 sm:py-10 px-2 sm:px-4">
      <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-5 sm:p-8">
        <div className="flex items-center gap-2 text-[#807d72] mb-2.5">
          <ShieldCheck className="w-4 h-4 text-[#f54e00] shrink-0" />
          <span className="text-[13px] font-normal">
            درگاه اختصاصی استاد و مدیر سامانه
          </span>
        </div>

        <h1 className="text-[22px] sm:text-[26px] font-semibold sm:font-normal tracking-[-0.325px] leading-[1.25] text-[#26251e] mb-2">
          ورود اساتید به میز کار مکتب‌یار
        </h1>
        <p className="text-[14px] text-[#5a5852] leading-[1.6] mb-5">
          نام کاربری و رمز عبور اختصاصی استاد را وارد نمایید تا به کلاس‌ها، دانش‌آموزان و تقویم آموزشی خود دسترسی پیدا کنید.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-[8px] border border-[#cf2d56]/30 bg-[#cf2d56]/5 text-[#cf2d56] text-[13px] font-medium flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-[#cf2d56]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="teacher-username"
              className="block text-[14px] font-semibold text-[#26251e] mb-1.5"
            >
              نام کاربری استاد
            </label>
            <div className="relative">
              <input
                id="teacher-username"
                type="text"
                dir="ltr"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full min-h-[48px] px-4 py-3 text-left text-[16px] sm:text-[14px] font-mono-code text-[#26251e] placeholder:text-[#a09c92] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                required
              />
              <User className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4" />
            </div>
          </div>

          <div>
            <label
              htmlFor="teacher-password"
              className="block text-[14px] font-semibold text-[#26251e] mb-1.5"
            >
              رمز عبور
            </label>
            <div className="relative">
              <input
                id="teacher-password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full min-h-[48px] pl-12 pr-10 py-3 text-left text-[16px] sm:text-[14px] font-mono-code text-[#26251e] placeholder:text-[#a09c92] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                required
              />
              <Lock className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#807d72] hover:text-[#26251e] absolute left-1 top-0.5 cursor-pointer"
                aria-label="نمایش رمز عبور"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-[#f54e00] rounded cursor-pointer"
            />
            <span className="text-[13px] font-medium text-[#26251e]">
              مرا به خاطر بسپار (حفظ ورود پس از رفرش صفحه)
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-[18px] py-[12px] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[15px] font-semibold rounded-[8px] transition-colors cursor-pointer"
          >
            {loading ? 'در حال بررسی اعتبار...' : 'ورود به میز کار استاد'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#e6e5e0] flex items-center justify-between text-[13px] text-[#807d72]">
          <span>دانش‌آموز هستید؟</span>
          <button
            type="button"
            onClick={onSwitchToStudentPortal}
            className="min-h-[44px] px-2 flex items-center font-semibold text-[#26251e] hover:text-[#f54e00] transition-colors cursor-pointer"
          >
            ورود دانش‌آموز ←
          </button>
        </div>
      </div>
    </div>
  );
};
