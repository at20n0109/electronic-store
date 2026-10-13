'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDistricts,
  getProvinces,
  getWards,
  type GhnAddressOption,
} from '@/lib/api';

const selectClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

export interface LocationValue {
  receiverProvinceId?: number;
  receiverDistrictId?: number;
  receiverWardCode?: string;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function SearchableSelect({
  label,
  placeholder,
  loadingHint,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  loadingHint: string;
  options: GhnAddressOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => String(option.id) === value);

  const matches = useMemo(() => {
    const needle = normalize(open ? typed : '');
    if (!needle) return options;
    return options.filter((option) => normalize(option.name).includes(needle));
  }, [options, open, typed]);

  function openList(): void {
    setTyped('');
    setActiveIndex(0);
    setOpen(true);
  }

  // The dropdown is opened from pointer events rather than React's onFocus: in
  // this build onFocus is never delivered (the input takes DOM focus but no
  // focus event reaches React), which left the list permanently shut and the
  // address unselectable. Native mousedown still fires, and preventDefault
  // keeps DOM focus on the input so the user can keep typing to filter.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="location-options"
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={selected?.name ?? (open ? typed : '')}
        placeholder={options.length === 0 ? loadingHint : placeholder}
        onPointerDown={(event) => {
          event.preventDefault();
          openList();
          inputRef.current?.focus();
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          openList();
          inputRef.current?.focus();
        }}
        onChange={(event) => {
          setTyped(event.target.value);
          setOpen(true);
          setActiveIndex(0);
          onChange(undefined);
        }}
        onKeyDown={(event) => {
          if (!open && event.key !== 'Escape') {
            openList();
          }
          if (event.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex(
              (current) =>
                (current + step + matches.length) % Math.max(matches.length, 1),
            );
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const picked = matches[activeIndex];
            if (picked) {
              onChange(String(picked.id));
              setOpen(false);
              setTyped('');
            }
          }
        }}
        className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}
      />

      {open && !disabled && (
        <ul
          id="location-options"
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {matches.length === 0 && (
            <li className="px-4 py-2 text-sm text-zinc-500">
              Không tìm thấy kết quả
            </li>
          )}
          {matches.map((option, index) => {
            const active = index === activeIndex;
            const isSelected = String(option.id) === value;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(String(option.id));
                    setOpen(false);
                    setTyped('');
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    active
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      : 'text-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  <span>{option.name}</span>
                  {isSelected && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Province -> district -> ward, cascading. The ids and ward codes are GHN's own
 * master data: they are what a courier needs to route a parcel, so the order
 * stores them alongside the free-text street address.
 *
 * Each dependent list is fetched only for the currently selected parent. The
 * child selects are deliberately NOT keyed by their parent id: re-keying
 * unmounts the field, and the unmount/remount cycle left a second, unlocked
 * copy of the district input in the DOM — one that accepted districts from a
 * different province. Clearing the child value on parent change (done in the
 * parent's onChange) drops stale options just as well, without remounting.
 * The "loading" hint is derived from the list being empty, so no effect has to
 * set state up front.
 */
export function LocationPicker({
  provinceId,
  districtId,
  wardCode,
  onChange,
}: {
  provinceId?: number;
  districtId?: number;
  wardCode?: string;
  onChange: (value: LocationValue) => void;
}) {
  const [provinces, setProvinces] = useState<GhnAddressOption[]>([]);
  const [districts, setDistricts] = useState<GhnAddressOption[]>([]);
  const [wards, setWards] = useState<GhnAddressOption[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProvinces()
      .then((rows) => {
        if (active) setProvinces(rows);
      })
      .catch(() => {
        if (active) {
          setError('Không tải được danh sách tỉnh/thành. Vui lòng thử lại.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    let active = true;
    getDistricts(provinceId)
      .then((rows) => {
        if (active) {
          setDistricts(rows);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Không tải được danh sách quận/huyện.');
      });
    return () => {
      active = false;
    };
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) return;
    let active = true;
    getWards(districtId)
      .then((rows) => {
        if (active) setWards(rows);
      })
      .catch(() => {
        if (active) setError('Không tải được danh sách phường/xã.');
      });
    return () => {
      active = false;
    };
  }, [districtId]);

  const provinceName = provinces.find(
    (row) => String(row.id) === String(provinceId),
  )?.name;
  const districtName = districts.find(
    (row) => String(row.id) === String(districtId),
  )?.name;
  const wardName = wards.find((row) => String(row.id) === wardCode)?.name;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SearchableSelect
        label="Tỉnh/Thành phố"
        placeholder="— Chọn tỉnh/thành —"
        loadingHint="Đang tải..."
        options={provinces}
        value={provinceId === undefined ? undefined : String(provinceId)}
        onChange={(next) =>
          onChange({
            receiverProvinceId: next ? Number(next) : undefined,
            receiverDistrictId: undefined,
            receiverWardCode: undefined,
          })
        }
      />

      <SearchableSelect
        label="Quận/Huyện"
        placeholder="— Chọn quận/huyện —"
        loadingHint={provinceId ? 'Đang tải...' : '— Chọn quận/huyện —'}
        options={districts}
        disabled={!provinceId}
        value={districtId === undefined ? undefined : String(districtId)}
        onChange={(next) =>
          onChange({
            receiverDistrictId: next ? Number(next) : undefined,
            receiverWardCode: undefined,
          })
        }
      />

      <SearchableSelect
        label="Phường/Xã"
        placeholder="— Chọn phường/xã —"
        loadingHint={districtId ? 'Đang tải...' : '— Chọn phường/xã —'}
        options={wards}
        disabled={!districtId}
        value={wardCode}
        onChange={(next) => onChange({ receiverWardCode: next })}
      />

      {error && <p className="text-xs text-red-600 sm:col-span-3">{error}</p>}

      {provinceName && districtName && wardName && (
        <p className="text-xs text-zinc-500 sm:col-span-3 dark:text-zinc-400">
          Địa chỉ nhận hàng: {provinceName} · {districtName} · {wardName}
        </p>
      )}
    </div>
  );
}
