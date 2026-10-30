import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { MobilePlatform } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  isOpen: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  detectedPlatform: MobilePlatform;
  onInstallNative: () => Promise<boolean>;
  onDismiss: (remember?: boolean) => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isOpen,
  isInstallable,
  isInstalled,
  detectedPlatform,
  onInstallNative,
  onDismiss,
}) => {
  const [activeTab, setActiveTab] = useState<MobilePlatform>(detectedPlatform);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setActiveTab(detectedPlatform);
  }, [detectedPlatform]);

  if (isInstalled || !isOpen) {
    return null;
  }

  const handleNativeInstallClick = async () => {
    setInstalling(true);
    try {
      await onInstallNative();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#26251e]/45 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      dir="rtl"
    >
      {/* Backdrop click to dismiss */}
      <div
        className="fixed inset-0"
        onClick={() => onDismiss(true)}
        aria-hidden="true"
      />

      {/* Customized Modal / Bottom Sheet Card */}
      <div className="relative z-10 w-full sm:max-w-[460px] bg-[#ffffff] border-t sm:border border-[#cfcdc4] rounded-t-[20px] sm:rounded-[16px] p-4 sm:p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Top Mobile Drag Handle Indicator */}
        <div className="w-10 h-1 bg-[#cfcdc4] rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#e6e5e0]">
          <div className="flex items-center gap-3">
            {/* App Icon Preview */}
            <div className="w-12 h-12 rounded-[12px] bg-[#26251e] border border-[#cfcdc4] flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
              <div className="w-full h-3 bg-[#f54e00] absolute top-0 inset-x-0" />
              <span className="text-[13px] font-bold text-[#f7f7f4] mt-2">
                مکتب‌یار
              </span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f54e00] bg-[#fafaf7] border border-[#e6e5e0] px-2 py-0.5 rounded-[4px] mb-1">
                <Sparkles className="w-3 h-3" />
                <span>نسخه وب‌اپلیکیشن موبایل (PWA)</span>
              </div>
              <h2
                id="pwa-install-title"
                className="text-[16px] sm:text-[17px] font-bold text-[#26251e] leading-snug"
              >
                افزودن «مکتب‌یار» به صفحه اصلی گوشی
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(true)}
            className="min-h-[40px] min-w-[40px] -mt-1 -ml-1 flex items-center justify-center rounded-[8px] text-[#807d72] hover:text-[#26251e] hover:bg-[#fafaf7] transition-colors cursor-pointer shrink-0"
            aria-label="بستن پنجره راهنمای نصب"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Value Proposition Banner */}
        <p className="text-[13px] text-[#5a5852] leading-relaxed mt-3">
          برای دسترسی سریع‌تر به تقویم جلسات، ثبت حضور و غیاب، شارژ جلسات و
          گفتگوی مستقیم بدون نیاز به وارد کردن آدرس سایت، وب‌اپلیکیشن را به{' '}
          <span className="font-semibold text-[#26251e]">
            صفحه اصلی (Home Screen)
          </span>{' '}
          گوشی خود اضافه کنید.
        </p>

        {/* Platform Switcher Tabs: Android vs iPhone (iOS) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f0efea] border border-[#e6e5e0] rounded-[10px] mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`min-h-[42px] px-3 py-2 rounded-[8px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'android'
                ? 'bg-[#ffffff] text-[#26251e] border border-[#cfcdc4] shadow-2xs'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#f54e00] shrink-0" />
            <span>گوشی‌های اندروید</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`min-h-[42px] px-3 py-2 rounded-[8px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-[#ffffff] text-[#26251e] border border-[#cfcdc4] shadow-2xs'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#f54e00] shrink-0" />
            <span>آیفون و آیپد (iOS)</span>
          </button>
        </div>

        {/* Platform-Specific Instructions */}
        <div className="mt-4">
          {activeTab === 'android' ? (
            <div className="space-y-3">
              {/* Direct 1-Tap Native Install Button when Chrome supports beforeinstallprompt */}
              {isInstallable && (
                <div className="p-3.5 rounded-[12px] bg-[#fafaf7] border border-[#f54e00]/40">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span className="text-[13px] font-semibold text-[#26251e]">
                      نصب مستقیم و خودکار در اندروید
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[#1f8a65]/10 text-[#1f8a65]">
                      آماده نصب آنی
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstallClick}
                    disabled={installing}
                    className="w-full min-h-[48px] px-4 py-2.5 bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] text-[#ffffff] rounded-[8px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {installing
                        ? 'در حال باز کردن پنجره نصب...'
                        : 'نصب و افزودن مستقیم به صفحه اصلی'}
                    </span>
                  </button>
                </div>
              )}

              {/* Step-by-Step Visual Guide for Android Chrome / Samsung Browser */}
              <div className="p-3.5 rounded-[12px] bg-[#fafaf7] border border-[#e6e5e0] space-y-3">
                <div className="text-[12px] font-semibold text-[#5a5852]">
                  راهنمای گام‌به‌گام در مرورگرهای اندروید (Chrome):
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#cfcdc4] flex items-center justify-center text-[12px] font-mono-code font-bold text-[#f54e00] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 text-[13px] text-[#26251e] leading-relaxed">
                    در نوار بالا (یا پایین) مرورگر کروم، روی دکمه منوی{' '}
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-[#ffffff] border border-[#cfcdc4] font-semibold text-[12px] align-middle">
                      <MoreVertical className="w-3.5 h-3.5 text-[#f54e00]" />
                      سه نقطه
                    </span>{' '}
                    بزنید.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#cfcdc4] flex items-center justify-center text-[12px] font-mono-code font-bold text-[#f54e00] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 text-[13px] text-[#26251e] leading-relaxed">
                    از منوی بازشده، گزینه{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-[#ffffff] border border-[#cfcdc4] font-semibold text-[12px] align-middle">
                      <Download className="w-3.5 h-3.5 text-[#f54e00]" />
                      Install app
                    </span>{' '}
                    یا{' '}
                    <span className="font-semibold">
                      «Add to Home screen» (افزودن به صفحه اصلی)
                    </span>{' '}
                    را لمس کنید.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#cfcdc4] flex items-center justify-center text-[12px] font-mono-code font-bold text-[#f54e00] shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1 text-[13px] text-[#26251e] leading-relaxed">
                    در کادر تایید، روی دکمه{' '}
                    <span className="px-1.5 py-0.5 rounded bg-[#26251e] text-[#f7f7f4] text-[11px] font-semibold">
                      Install / Add
                    </span>{' '}
                    بزنید تا آیکون برنامه در صفحه اصلی گوشی قرار گیرد.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* iOS / iPhone Safari Step-by-Step Guide */
            <div className="p-3.5 rounded-[12px] bg-[#fafaf7] border border-[#e6e5e0] space-y-3">
              <div className="text-[12px] font-semibold text-[#5a5852]">
                راهنمای گام‌به‌گام در آیفون و آیپد (مرورگر Safari):
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#cfcdc4] flex items-center justify-center text-[12px] font-mono-code font-bold text-[#f54e00] shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-[13px] text-[#26251e] leading-relaxed">
                  در نوار پایین مرورگر{' '}
                  <span className="font-semibold">Safari</span>، روی دکمه{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-[#ffffff] border border-[#cfcdc4] font-semibold text-[12px] align-middle">
                    <Share className="w-3.5 h-3.5 text-[#f54e00]" />
                    Share (اشتراک‌گذاری)
                  </span>{' '}
                  بزنید.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#cfcdc4] flex items-center justify-center text-[12px] font-mono-code font-bold text-[#f54e00] shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-[13px] text-[#26251e] leading-relaxed">
                  لیست گزینه‌ها را کمی به بالا بکشید و روی گزینه{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-[#ffffff] border border-[#cfcdc4] font-semibold text-[12px] align-middle">
                    <PlusSquare className="w-3.5 h-3.5 text-[#f54e00]" />
                    Add to Home Screen
                  </span>{' '}
                  (افزودن به صفحه اصلی) بزنید.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#cfcdc4] flex items-center justify-center text-[12px] font-mono-code font-bold text-[#f54e00] shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1 text-[13px] text-[#26251e] leading-relaxed">
                  در گوشه بالا سمت راست، روی دکمه{' '}
                  <span className="px-2 py-0.5 rounded bg-[#26251e] text-[#f7f7f4] text-[11px] font-semibold">
                    Add
                  </span>{' '}
                  بزنید تا آیکون اختصاصی «مکتب‌یار» به صفحه اصلی آیفون شما اضافه
                  شود.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Benefits Strip */}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5a5852] bg-[#fafaf7] border border-[#e6e5e0] rounded-[8px] px-2.5 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1f8a65] shrink-0" />
            <span>اجرای تمام‌صفحه و سریع</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5a5852] bg-[#fafaf7] border border-[#e6e5e0] rounded-[8px] px-2.5 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1f8a65] shrink-0" />
            <span>ورود یک‌کلیکی بدون مرورگر</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-[#e6e5e0] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDismiss(true)}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-[8px] border border-[#cfcdc4] bg-[#ffffff] hover:bg-[#fafaf7] text-[#26251e] text-[13px] font-semibold transition-colors cursor-pointer"
          >
            متوجه شدم، بعداً انجام می‌دهم
          </button>
        </div>
      </div>
    </div>
  );
};
