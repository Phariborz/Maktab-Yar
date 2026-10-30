import React from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Plus } from 'lucide-react';
import {
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAYS_SHORT,
  getJalaliMonthDays,
  getJalaliDayOfWeek,
  formatJalaliString,
  toPersianDigits,
  getCurrentJalaliDate,
} from '../utils/jalali';
import type { ClassSession } from '../types';

interface JalaliCalendarProps {
  year: number;
  month: number;
  selectedDate: string;
  sessions: ClassSession[];
  onChangeMonth: (newYear: number, newMonth: number) => void;
  onSelectDate: (jalaliDate: string) => void;
  onAddSessionOnDate?: (jalaliDate: string) => void;
}

export const JalaliCalendar: React.FC<JalaliCalendarProps> = ({
  year,
  month,
  selectedDate,
  sessions,
  onChangeMonth,
  onSelectDate,
  onAddSessionOnDate,
}) => {
  const today = getCurrentJalaliDate();
  const daysInMonth = getJalaliMonthDays(year, month);
  const firstDayDow = getJalaliDayOfWeek(year, month, 1);

  const handlePrevMonth = () => {
    if (month === 1) {
      onChangeMonth(year - 1, 12);
    } else {
      onChangeMonth(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onChangeMonth(year + 1, 1);
    } else {
      onChangeMonth(year, month + 1);
    }
  };

  const handleGoToday = () => {
    onChangeMonth(today.year, today.month);
    onSelectDate(today.formatted);
  };

  const blankCells = Array.from({ length: firstDayDow }, (_, i) => i);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
      {/* Calendar Header — Touch-Friendly 44x44px Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-[#e6e5e0]">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#f54e00] shrink-0" />
          <h2 className="text-[17px] sm:text-[22px] font-semibold sm:font-normal tracking-[-0.11px] text-[#26251e]">
            {JALALI_MONTH_NAMES[month - 1]} {toPersianDigits(year)}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5a5852] hover:text-[#26251e] border border-[#e6e5e0] hover:border-[#cfcdc4] bg-[#fafaf7] rounded-[8px] transition-colors cursor-pointer"
            title="ماه قبل"
            aria-label="ماه قبل"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGoToday}
            className="min-h-[44px] px-3.5 text-[13px] font-medium text-[#26251e] bg-[#fafaf7] border border-[#cfcdc4] hover:bg-[#e6e5e0]/50 rounded-[8px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            امروز ({toPersianDigits(today.day)} {today.monthName})
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5a5852] hover:text-[#26251e] border border-[#e6e5e0] hover:border-[#cfcdc4] bg-[#fafaf7] rounded-[8px] transition-colors cursor-pointer"
            title="ماه بعد"
            aria-label="ماه بعد"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 text-center">
        {JALALI_WEEKDAYS_SHORT.map((dayLabel, idx) => (
          <div
            key={dayLabel}
            className={`py-1 text-[12px] sm:text-[13px] font-semibold ${
              idx === 6 ? 'text-[#cf2d56]' : 'text-[#807d72]'
            }`}
          >
            {dayLabel}
          </div>
        ))}
      </div>

      {/* Days Grid — Uncluttered Mobile Cells (>=48px tap targets) + Detailed Desktop Cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {blankCells.map((b) => (
          <div
            key={`blank-${b}`}
            className="min-h-[52px] sm:min-h-[86px] rounded-[8px] bg-[#fafaf7]/60 border border-transparent"
          />
        ))}

        {dayCells.map((dayNum) => {
          const dateStr = formatJalaliString(year, month, dayNum);
          const isToday = dateStr === today.formatted;
          const isSelected = dateStr === selectedDate;
          const daySessions = sessions.filter((s) => s.jalaliDate === dateStr);
          const dow = getJalaliDayOfWeek(year, month, dayNum);
          const isFriday = dow === 6;

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(dateStr);
                }
              }}
              className={`group min-h-[52px] sm:min-h-[88px] p-1.5 sm:p-2.5 rounded-[8px] border text-center sm:text-right transition-colors cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#f54e00] bg-[#fafaf7]'
                  : isToday
                  ? 'border-[#26251e] bg-[#fafaf7]'
                  : 'border-[#efeee8] bg-[#ffffff] hover:border-[#cfcdc4] hover:bg-[#fafaf7]'
              }`}
            >
              <div className="flex items-center justify-center sm:justify-between">
                <span
                  className={`font-mono-code text-[13px] sm:text-[14px] ${
                    isSelected
                      ? 'text-[#f54e00] font-semibold'
                      : isToday
                      ? 'text-[#26251e] font-semibold'
                      : isFriday
                      ? 'text-[#cf2d56]'
                      : 'text-[#26251e]'
                  }`}
                >
                  {toPersianDigits(dayNum)}
                  <span className="hidden sm:inline">
                    {isToday ? ' · امروز' : ''}
                  </span>
                </span>

                {onAddSessionOnDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSessionOnDate(dateStr);
                    }}
                    className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-[#807d72] hover:text-[#f54e00] rounded transition-opacity cursor-pointer"
                    title="افزودن جلسه در این روز"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Compact Indicator: Clean session count without overflowing text */}
              {daySessions.length > 0 && (
                <div className="sm:hidden mt-1 text-[10px] font-semibold font-mono-code text-[#f54e00] leading-none">
                  {toPersianDigits(daySessions.length)} جلسه
                </div>
              )}

              {/* Desktop Detailed Session Preview */}
              <div className="hidden sm:block mt-1.5 space-y-1">
                {daySessions.slice(0, 2).map((sess) => {
                  const statusTone =
                    sess.attendanceStatus === 'present'
                      ? 'text-[#1f8a65]'
                      : sess.attendanceStatus === 'absent_charged'
                      ? 'text-[#cf2d56] font-medium'
                      : sess.attendanceStatus === 'absent'
                      ? 'text-[#cf2d56] line-through'
                      : 'text-[#26251e]';
                  return (
                    <div
                      key={sess.id}
                      className={`text-[11px] leading-tight truncate ${statusTone}`}
                      title={`${sess.studentName} · ${sess.subject} (${toPersianDigits(sess.time)})`}
                    >
                      <span className="font-mono-code text-[11px] text-[#807d72]">
                        {toPersianDigits(sess.time)}
                      </span>{' '}
                      · {sess.studentName}
                    </div>
                  );
                })}
                {daySessions.length > 2 && (
                  <div className="text-[11px] text-[#f54e00] font-medium tabular-nums">
                    + {toPersianDigits(daySessions.length - 2)} جلسه دیگر
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
