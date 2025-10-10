import React, { useMemo, useState } from 'react';

interface InlineDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (input: number) => String(input).padStart(2, '0');

const toISOStringDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseIsoDate = (value: string | null | undefined) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const isSameDay = (a: Date | null, b: Date | null) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const InlineDatePicker: React.FC<InlineDatePickerProps> = ({ value, onChange, disabled = false }) => {
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const initialVisible = useMemo(() => selectedDate ?? new Date(), [selectedDate]);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialVisible.getFullYear(), initialVisible.getMonth(), 1)
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(visibleMonth),
    [visibleMonth]
  );

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const startOffset = firstOfMonth.getDay(); // Sunday = 0
    const firstVisibleDate = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1 - startOffset
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstVisibleDate);
      date.setDate(firstVisibleDate.getDate() + index);
      const inCurrentMonth = date.getMonth() === visibleMonth.getMonth();
      return {
        date,
        label: date.getDate(),
        inCurrentMonth
      };
    });
  }, [visibleMonth]);

  const handleSelect = (date: Date) => {
    if (disabled) return;
    onChange(toISOStringDate(date));
  };

  const navigate = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const today = useMemo(() => new Date(), []);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded border border-slate-200 px-2 py-1 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          disabled={disabled}
        >
          이전
        </button>
        <span>{monthLabel}</span>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="rounded border border-slate-200 px-2 py-1 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          disabled={disabled}
        >
          다음
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-medium text-slate-500 dark:text-slate-400"
          >
            {label}
          </div>
        ))}
        {calendarDays.map(({ date, label, inCurrentMonth }) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const baseClasses =
            'flex h-8 items-center justify-center rounded text-xs transition focus:outline-none focus:ring-2 focus:ring-amber-300';
          const stateClasses = [
            inCurrentMonth
              ? 'text-slate-700 dark:text-slate-200'
              : 'text-slate-300 dark:text-slate-600',
            isSelected
              ? 'bg-amber-500 text-white hover:bg-amber-500 dark:bg-amber-400 dark:text-amber-900'
              : 'hover:bg-amber-100 dark:hover:bg-amber-400/20',
            isToday && !isSelected ? 'border border-amber-400' : 'border border-transparent',
            disabled ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : 'cursor-pointer'
          ].join(' ');

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleSelect(date)}
              className={`${baseClasses} ${stateClasses}`}
              disabled={disabled}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InlineDatePicker;
