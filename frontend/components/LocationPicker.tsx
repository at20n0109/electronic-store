'use client';

import { useEffect, useState } from 'react';
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

/**
 * Province -> district -> ward, cascading. The ids and ward codes are GHN's own
 * master data: they are what a courier needs to route a parcel, so the order
 * stores them alongside the free-text street address.
 *
 * Each dependent list is fetched only for the currently selected parent, and
 * the child select is keyed by that parent so it remounts — dropping stale
 * options — rather than being emptied by a reset. The "loading" hint is derived
 * from the list being empty, so no effect has to set state up front.
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

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tỉnh/Thành phố
        </label>
        <select
          required
          value={provinceId ?? ''}
          onChange={(e) =>
            onChange({
              receiverProvinceId: Number(e.target.value) || undefined,
              receiverDistrictId: undefined,
              receiverWardCode: undefined,
            })
          }
          className={selectClass}
        >
          <option value="">— Chọn tỉnh/thành —</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Quận/Huyện
        </label>
        <select
          key={provinceId ?? 'none'}
          required
          disabled={!provinceId}
          value={districtId ?? ''}
          onChange={(e) =>
            onChange({
              receiverDistrictId: Number(e.target.value) || undefined,
              receiverWardCode: undefined,
            })
          }
          className={`${selectClass} disabled:opacity-50`}
        >
          <option value="">
            {provinceId && districts.length === 0
              ? 'Đang tải...'
              : '— Chọn quận/huyện —'}
          </option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Phường/Xã
        </label>
        <select
          key={districtId ?? 'none'}
          required
          disabled={!districtId}
          value={wardCode ?? ''}
          onChange={(e) =>
            onChange({ receiverWardCode: e.target.value || undefined })
          }
          className={`${selectClass} disabled:opacity-50`}
        >
          <option value="">
            {districtId && wards.length === 0
              ? 'Đang tải...'
              : '— Chọn phường/xã —'}
          </option>
          {wards.map((ward) => (
            <option key={ward.id} value={String(ward.id)}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-600 sm:col-span-3">{error}</p>}
    </div>
  );
}
