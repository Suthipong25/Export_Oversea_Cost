'use client';

import React from 'react';
import Image from 'next/image';

interface ContainerSelectorProps {
  activeType: string;
  quantity: number;
  onSelect: (type: string, qty: number) => void;
  onAdjustQty: (delta: number) => void;
}

const CONTAINERS = [
  {
    id: '20',
    name: "20' Standard",
    specs: "33.2 CBM • Max 28,000 kg",
    svg: '/container_20.svg',
  },
  {
    id: '40',
    name: "40' Standard",
    specs: "67.7 CBM • Max 26,500 kg",
    svg: '/container_40.svg',
  },
  {
    id: '40hc',
    name: "40' High Cube (HQ)",
    specs: "76.4 CBM (สูง 9'6\")",
    svg: '/container_40hc.svg',
    isPopular: true,
  },
  {
    id: '45',
    name: "45' High Cube",
    specs: "86.0 CBM • Extra Volume",
    svg: '/container_45.svg',
  },
];

export const ContainerSelector: React.FC<ContainerSelectorProps> = ({
  activeType,
  quantity,
  onSelect,
  onAdjustQty,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {CONTAINERS.map((cntr) => {
        const isActive = activeType === cntr.id;

        return (
          <div
            key={cntr.id}
            className={`bg-white rounded-xl p-4 sm:p-5 border flex flex-col items-center text-center relative group transition-all duration-150 h-full justify-between cursor-pointer ${
              isActive
                ? 'border-slate-900 ring-1 ring-slate-900/10 shadow-sm bg-slate-50/40'
                : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
            onClick={() => {
              if (!isActive) onSelect(cntr.id, 1);
            }}
          >
            {cntr.isPopular && (
              <span className="absolute -top-2.5 bg-slate-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded tracking-wide shadow-2xs">
                ยอดนิยม
              </span>
            )}

            <div className="h-20 flex items-center justify-center mb-2 w-full">
              <Image
                src={cntr.svg}
                alt={cntr.name}
                width={115}
                height={65}
                className="w-28 h-16 select-none transition-transform duration-200 group-hover:scale-102 object-contain"
              />
            </div>

            <div>
              <span className="text-sm font-bold text-slate-900 block tracking-tight">{cntr.name}</span>
              <span className="text-[11px] text-slate-500 font-medium mb-3 block mt-0.5">{cntr.specs}</span>
            </div>

            <div className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
              {isActive ? (
                <div className="flex items-center justify-between border border-slate-300 bg-white rounded-lg p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onAdjustQty(-1)}
                    className="w-8 h-7 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer text-sm"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="font-bold text-slate-900 text-xs px-2 tabular-nums">
                    {quantity} <span className="font-normal text-slate-500 text-[11px]">ตู้</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustQty(1)}
                    className="w-8 h-7 rounded bg-slate-900 text-white font-bold hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-sm"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(cntr.id, 1)}
                  className="w-full py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  เลือกใช้อุปกรณ์นี้
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
