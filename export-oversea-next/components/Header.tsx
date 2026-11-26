'use client';

import React from 'react';
import Image from 'next/image';
import { BookOpen, FileUp } from 'lucide-react';

interface HeaderProps {
  onOpenRemarks: () => void;
  onOpenPdfUploader: () => void;
  isCloudLive?: boolean;
  ratesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRemarks,
  onOpenPdfUploader,
  isCloudLive = false,
  ratesCount = 0
}) => {
  return (
    <header className="bg-[#0A192F] text-white border-b border-blue-900/60 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        
        {/* Brand Logo & Platform Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl px-2.5 py-1 h-11 flex items-center justify-center shadow-md border border-white/10">
            <Image 
              src="/perkin_logo.jpg" 
              alt="Perkin Logistics (Thailand) Co., Ltd." 
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>
          <span className="font-black text-base sm:text-lg tracking-tight text-white hidden sm:inline-block">
            Perkin Logistics (Thailand) Co., Ltd.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          
          {/* Remarks & Conditions Library Button */}
          <button
            onClick={onOpenRemarks}
            className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg border border-slate-700 transition-colors cursor-pointer text-xs font-semibold"
          >
            <BookOpen className="w-4 h-4 text-slate-300" />
            <span>ข้อกำหนดสายเรือ</span>
          </button>

          {/* Drop PDF Upload Button */}
          <button
            onClick={onOpenPdfUploader}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer text-xs font-semibold"
          >
            <FileUp className="w-4 h-4 text-white" />
            <span>อัปเดตราคาจาก PDF</span>
          </button>

        </div>
      </div>
    </header>
  );
};
